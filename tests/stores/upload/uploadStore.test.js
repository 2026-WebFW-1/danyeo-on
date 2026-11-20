import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { refreshJourney } from '@/services/journeyService';
import {
  getMyData,
  getUploadedImagePaths,
  savePhotoImage,
  savePhotos,
} from '@/services/photoService';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { readExif } from '@/utils/upload/readExif';
import { readPhotos } from '@/utils/upload/readPhotos';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn(), resizeFull: vi.fn() }));
vi.mock('@/utils/upload/readExif', () => ({ readExif: vi.fn() }));
vi.mock('@/utils/upload/readPhotos', () => ({ readPhotos: vi.fn() }));
vi.mock('@/services/journeyService', () => ({ refreshJourney: vi.fn() }));
vi.mock('@/services/photoService', () => ({
  getMyData: vi.fn(),
  getUploadedImagePaths: vi.fn(),
  savePhotoImage: vi.fn(),
  savePhotos: vi.fn(),
}));

const { getState } = useUploadStore;
const photoFile = (name) => new File(['사진'], name, { type: 'image/jpeg' });
const thumb = new Blob(['썸네일'], { type: 'image/webp' });
// readExif가 촬영 정보를 다 읽은 사진에 돌려주는 값이에요.
const EXIF = {
  readable: true,
  takenAt: '2024-11-24T08:30:49',
  offset: '+09:00',
  timeUncertain: false,
  lat: 34.9949,
  lng: 135.785,
  camera: null,
};
// refreshJourney가 돌려주는 Journey예요. 여행이 없어서 newTripId는 null이에요.
const EMPTY_JOURNEY = { stops: [], trips: [] };

beforeEach(() => {
  getState().reset();
  vi.mocked(resizeThumbnail).mockResolvedValue(thumb);
  vi.mocked(readExif).mockResolvedValue(EXIF);
  vi.mocked(refreshJourney).mockResolvedValue(EMPTY_JOURNEY);
});

afterEach(() => {
  vi.useRealTimers();
  getState().reset();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('start', () => {
  test('준비된 장부터 원본·썸네일과 함께 보이고, 다 모이기 전에는 끝나지 않아요', async () => {
    // given: 두 번째 장은 줄이기가 끝나지 않음
    const files = [photoFile('첫장.jpg'), photoFile('둘째장.jpg')];
    vi.mocked(resizeThumbnail)
      .mockResolvedValueOnce(thumb)
      .mockReturnValueOnce(new Promise(() => {}));

    // when: 시작해서 첫 장이 준비되면
    void getState().start(files);
    await vi.waitFor(() => expect(getState().photos).toHaveLength(1));

    // then
    expect(getState().isDone).toBe(false);
    expect(getState().files[0]).toBe(files[0]);
    expect(getState().photos[0].thumb).toBe(thumb);
    expect(await (await fetch(getState().photos[0].src)).text()).toBe('썸네일');
  });

  test('다 준비되면 이름이 같아도 고른 순서대로 다른 id로 쌓이고 끝나요', async () => {
    // given
    const files = [photoFile('같은이름.jpg'), photoFile('같은이름.jpg')];

    // when
    await getState().start(files);

    // then
    expect(getState().photos.map((photo) => photo.id)).toEqual([
      '0-같은이름.jpg',
      '1-같은이름.jpg',
    ]);
    expect(getState().isDone).toBe(true);
    expect(resizeThumbnail).toHaveBeenCalledTimes(2);
  });

  test('원본에서 읽은 촬영 정보를 사진마다 함께 둬요', async () => {
    // given: 두 번째 사진은 촬영 정보가 없음
    const files = [photoFile('a.jpg'), photoFile('b.jpg')];
    const noExif = {
      ...EXIF,
      takenAt: null,
      offset: null,
      timeUncertain: true,
      lat: null,
      lng: null,
    };
    vi.mocked(readExif).mockResolvedValueOnce(EXIF).mockResolvedValueOnce(noExif);

    // when
    await getState().start(files);

    // then
    expect(vi.mocked(readExif).mock.calls.map(([file]) => file)).toEqual(files);
    expect(getState().photos[0]).toMatchObject(EXIF);
    expect(getState().photos[1]).toMatchObject(noExif);
  });

  test('미리 볼 수 없는 사진도 회색 칸으로 남기고 다음 사진을 처리해요', async () => {
    // given
    vi.mocked(resizeThumbnail).mockResolvedValueOnce(null);

    // when
    await getState().start([photoFile('사진.heic'), photoFile('사진.jpg')]);

    // then
    expect(getState()).toMatchObject({ noPreviewCount: 1, isDone: true });
    expect(getState().photos[0]).toMatchObject({ src: null, thumb: null });
    expect(getState().photos[1].src).toMatch(/^blob:/);
  });

  test('새로 고르면 기존 주소를 해제하고 새 사진만 남겨요', async () => {
    // given
    await getState().start([photoFile('이전.jpg')]);
    const previousUrl = getState().photos[0].src;
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    // when
    await getState().start([photoFile('새사진.jpg')]);

    // then
    expect(revoke).toHaveBeenCalledWith(previousUrl);
    expect(getState().photos.map((photo) => photo.filename)).toEqual(['새사진.jpg']);
  });

  test('이전 작업이 늦게 끝나도 새 사진과 완료 상태를 덮지 않아요', async () => {
    // given: 이전 작업이 첫 장을 줄이는 도중에 새로 골라 다 모음
    const previous = Promise.withResolvers();
    vi.mocked(resizeThumbnail).mockReturnValueOnce(previous.promise);
    const previousTask = getState().start([photoFile('이전.jpg'), photoFile('남은이전.jpg')]);
    await getState().start([photoFile('새사진.jpg')]);

    // when: 이전 작업의 줄이기가 늦게 끝나면
    previous.resolve(thumb);
    await previousTask;

    // then: 새 사진과 완료 상태가 그대로이고, 이전 작업은 남은 장을 열지 않음
    expect(getState().isDone).toBe(true);
    expect(getState().photos.map((photo) => photo.filename)).toEqual(['새사진.jpg']);
    expect(resizeThumbnail).toHaveBeenCalledTimes(2);
  });
});

describe('reset', () => {
  test('만든 주소를 한 번씩 해제하고 원본·썸네일을 비워요', async () => {
    // given
    await getState().start([photoFile('사진.jpg')]);
    const src = getState().photos[0].src;
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    // when
    getState().reset();
    getState().reset();

    // then
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
    expect(getState()).toMatchObject({ files: [], photos: [], noPreviewCount: 0, isDone: false });
  });

  test('줄이는 도중 취소하면 남은 사진을 열거나 새 주소를 만들지 않아요', async () => {
    // given: 첫 장을 줄이는 중
    const pending = Promise.withResolvers();
    vi.mocked(resizeThumbnail).mockReturnValueOnce(pending.promise);
    const createUrl = vi.spyOn(URL, 'createObjectURL');
    const task = getState().start([photoFile('사진.jpg'), photoFile('남은사진.jpg')]);

    // when
    getState().reset();
    pending.resolve(thumb);
    await task;

    // then
    expect(getState()).toMatchObject({ files: [], photos: [], isDone: false });
    expect(resizeThumbnail).toHaveBeenCalledTimes(1);
    expect(createUrl).not.toHaveBeenCalled();
  });
});

describe('skippedFiles', () => {
  test('고를 때 뺀 파일을 사진과 함께 두고, reset하면 같이 비워요', async () => {
    // given: 사진 한 장과 받지 않는 형식 한 개를 고름
    const skipped = [{ fileName: '메모.txt', reason: 'unsupported' }];
    await getState().start([photoFile('사진.jpg')], skipped);
    expect(getState().skippedFiles).toEqual(skipped);

    // when: [다시 고르기]처럼 reset하면
    getState().reset();

    // then: 다음 고르기에 전에 뺀 파일이 남지 않음
    expect(getState()).toMatchObject({ files: [], skippedFiles: [] });
  });
});

describe('stopCollecting', () => {
  /** 첫 장만 모이고 둘째 장을 줄이는 중일 때까지 모아요. */
  const startUntilFirst = async (names) => {
    const files = names.map((name) => photoFile(name));
    const pending = Promise.withResolvers();
    vi.mocked(resizeThumbnail).mockResolvedValueOnce(thumb).mockReturnValueOnce(pending.promise);
    const collecting = getState().start(files);
    await vi.waitFor(() => expect(getState().photos).toHaveLength(1));
    return { files, pending, collecting };
  };
  // 실제 readPhotos처럼 받은 files만 읽어요. files를 덜 잘랐으면 저장할 행이 늘어나요.
  const readResultOf = (files) => ({
    photos: files.map((file, order) => ({
      order,
      fileName: file.name,
      takenAt: null,
      dedupeKey: `|${file.name}`,
    })),
    skipped: [],
  });

  beforeEach(() => {
    vi.mocked(readPhotos).mockImplementation(async (files) => readResultOf(files));
  });

  test('모은 장까지만 남기고 다 모은 상태가 되고, 사진 주소는 해제하지 않아요', async () => {
    // given: 3장 중 1장이 모였고 둘째 장을 줄이는 중
    const { files } = await startUntilFirst(['a.jpg', 'b.jpg', 'c.jpg']);
    const revoke = vi.spyOn(URL, 'revokeObjectURL');

    // when
    getState().stopCollecting();

    // then
    expect(getState().files).toHaveLength(1);
    expect(getState().files[0]).toBe(files[0]);
    expect(getState().isDone).toBe(true);
    expect(getState().photos[0].src).toMatch(/^blob:/);
    expect(revoke).not.toHaveBeenCalled();
  });

  test('멈춘 뒤 줄이기가 늦게 끝나도 쌓지 않고 남은 장을 열지 않아요', async () => {
    // given
    const { pending, collecting } = await startUntilFirst(['a.jpg', 'b.jpg', 'c.jpg']);
    getState().stopCollecting();
    const createUrl = vi.spyOn(URL, 'createObjectURL');

    // when
    pending.resolve(thumb);
    await collecting;

    // then
    expect(getState().photos.map((photo) => photo.filename)).toEqual(['a.jpg']);
    expect(getState().files).toHaveLength(1);
    expect(resizeThumbnail).toHaveBeenCalledTimes(2);
    expect(createUrl).not.toHaveBeenCalled();
  });

  test('멈춘 뒤 저장하면 모은 사진만 저장하고 올려요', async () => {
    // given: 2장 중 1장에서 멈춤
    const { pending, collecting } = await startUntilFirst(['a.jpg', 'b.jpg']);
    getState().stopCollecting();
    pending.resolve(thumb);
    await collecting;
    vi.mocked(savePhotos).mockImplementation(async (photos) => ({
      saved: photos.map((photo) => photo.id),
      skipped: [],
    }));
    vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
    vi.mocked(savePhotoImage).mockResolvedValue();

    // when
    await getState().save('u1');
    await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

    // then
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    expect(rows.map((row) => row.fileName)).toEqual(['a.jpg']);
    expect(vi.mocked(resizeFull).mock.calls.map(([file]) => file.name)).toEqual(['a.jpg']);
    expect(getState().imageUpload.total).toBe(1);
  });

  test('다 모은 뒤에 불러도 진행 중인 저장을 취소하지 않아요', async () => {
    // given: 다 모은 뒤 저장 요청이 끝나기 전
    await getState().start([photoFile('a.jpg')]);
    const pending = Promise.withResolvers();
    vi.mocked(savePhotos).mockReturnValueOnce(pending.promise);
    const saving = getState().save('u1');
    await vi.waitFor(() => expect(savePhotos).toHaveBeenCalled());

    // when
    getState().stopCollecting();
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    pending.resolve({ saved: rows.map((row) => row.id), skipped: [] });
    await saving;

    // then
    expect(getState().saveStatus).toBe('saved');
  });

  test('한 장도 안 모였으면 아무것도 바꾸지 않아요', () => {
    // given: 첫 장을 줄이는 중
    vi.mocked(resizeThumbnail).mockReturnValueOnce(new Promise(() => {}));
    void getState().start([photoFile('a.jpg')]);

    // when
    getState().stopCollecting();

    // then
    expect(getState().files).toHaveLength(1);
    expect(getState().isDone).toBe(false);
  });
});

describe('answerPass', () => {
  test('사진마다 답을 남기고, 비우면 답도 지워요', () => {
    // given
    getState().answerPass('3-photo.jpg', 'exclude');
    getState().answerPass('7-beach.jpg', 'later');

    // when
    const answers = getState().passAnswers;
    getState().reset();

    // then
    expect(answers).toEqual({ '3-photo.jpg': 'exclude', '7-beach.jpg': 'later' });
    expect(getState().passAnswers).toEqual({});
  });
});

describe('uploadImages', () => {
  const full = new Blob(['보기용'], { type: 'image/webp' });
  const targetsOf = (count) =>
    Array.from({ length: count }, (_, order) => ({ order, fileKey: `photos:u/p_${order}` }));
  const startWith = (count) =>
    getState().start(Array.from({ length: count }, (_, order) => photoFile(`${order}.jpg`)));

  beforeEach(() => {
    vi.mocked(resizeFull).mockResolvedValue(full);
    vi.mocked(savePhotoImage).mockResolvedValue();
  });

  test('쌓을 때 만든 썸네일과 새로 만든 보기용을 올리고, 올린 수를 세요', async () => {
    // given
    await startWith(2);
    vi.mocked(resizeThumbnail).mockClear();

    // when
    await getState().uploadImages(targetsOf(2));

    // then
    expect(savePhotoImage).toHaveBeenCalledWith('photos:u/p_0', { full, thumb });
    expect(savePhotoImage).toHaveBeenCalledWith('photos:u/p_1', { full, thumb });
    expect(resizeThumbnail).not.toHaveBeenCalled();
    expect(getState().imageUpload).toEqual({ total: 2, uploaded: 2, skipped: 0, failed: 0 });
  });

  test('브라우저가 못 여는 사진은 올리지 않고 건너뛴 수로 세요', async () => {
    // given
    vi.mocked(resizeThumbnail).mockResolvedValue(null);
    await startWith(1);

    // when
    await getState().uploadImages(targetsOf(1));

    // then
    expect(resizeFull).not.toHaveBeenCalled();
    expect(savePhotoImage).not.toHaveBeenCalled();
    expect(getState().imageUpload).toEqual({ total: 1, uploaded: 0, skipped: 1, failed: 0 });
  });

  test('실패하면 기다렸다가 다시 시도하고, 세 번 다 실패하면 실패로 세요', async () => {
    // given: p_0은 한 번 실패한 뒤 성공, p_1은 계속 실패
    await startWith(2);
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const attempts = {};
    vi.mocked(savePhotoImage).mockImplementation(async (fileKey) => {
      attempts[fileKey] = (attempts[fileKey] ?? 0) + 1;
      if (fileKey === 'photos:u/p_1' || attempts[fileKey] === 1) throw new Error('네트워크');
    });

    // when
    const uploading = getState().uploadImages(targetsOf(2));
    await vi.runAllTimersAsync();
    await uploading;

    // then
    expect(attempts).toEqual({ 'photos:u/p_0': 2, 'photos:u/p_1': 3 });
    expect(getState().imageUpload).toEqual({ total: 2, uploaded: 1, skipped: 0, failed: 1 });
  });

  test('한 번에 3장까지만 올려요', async () => {
    // given
    await startWith(5);
    let running = 0;
    let maxRunning = 0;
    vi.mocked(savePhotoImage).mockImplementation(async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    // when
    await getState().uploadImages(targetsOf(5));

    // then
    expect(maxRunning).toBe(3);
    expect(getState().imageUpload).toMatchObject({ total: 5, uploaded: 5 });
  });

  test('도중에 비우면 남은 사진은 올리지 않고 진행 상태도 되살리지 않아요', async () => {
    // given: 처음 올리는 순간 새로 고름
    await startWith(5);
    vi.mocked(savePhotoImage).mockImplementation(async () => getState().reset());

    // when
    await getState().uploadImages(targetsOf(5));

    // then: 보기용을 같이 줄이던 나머지 2장도 올리기 직전에 멈춰요
    expect(savePhotoImage).toHaveBeenCalledTimes(1);
    expect(getState().imageUpload).toEqual({ total: 0, uploaded: 0, skipped: 0, failed: 0 });
  });

  test('보기용을 줄이는 도중 비우면 그 사진도 올리지 않아요', async () => {
    // given: 보기용을 줄이는 중
    await startWith(1);
    const pending = Promise.withResolvers();
    vi.mocked(resizeFull).mockReturnValueOnce(pending.promise);
    const uploading = getState().uploadImages(targetsOf(1));

    // when
    getState().reset();
    pending.resolve(full);
    await uploading;

    // then
    expect(savePhotoImage).not.toHaveBeenCalled();
  });

  test('다시 시도를 기다리는 도중 비우면 다시 올리지 않아요', async () => {
    // given: 첫 시도가 실패해서 기다리는 중
    await startWith(1);
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(savePhotoImage).mockRejectedValue(new Error('네트워크'));
    const uploading = getState().uploadImages(targetsOf(1));
    await vi.advanceTimersByTimeAsync(0);

    // when
    getState().reset();
    await vi.runAllTimersAsync();
    await uploading;

    // then
    expect(savePhotoImage).toHaveBeenCalledTimes(1);
  });
});

describe('save', () => {
  const TAKEN_AT = '2024-11-24T08:30:49';
  const full = new Blob(['보기용'], { type: 'image/webp' });
  const pick = (names) => getState().start(names.map((name) => photoFile(name)));
  const readResultOf = (names) => ({
    photos: names.map((fileName, order) => ({
      order,
      fileName,
      takenAt: TAKEN_AT,
      offset: null,
      timeUncertain: true,
      lat: null,
      lng: null,
      camera: null,
      dedupeKey: `${TAKEN_AT}|${fileName}`,
    })),
    skipped: [],
    counts: { unreadable: 0, noDate: 0, noLocation: 0 },
  });
  const uploadedKeys = () => vi.mocked(savePhotoImage).mock.calls.map(([fileKey]) => fileKey);
  // 이미지 올리기는 save가 끝난 뒤에도 뒤에서 돌아서, 다 끝날 때까지 기다려요.
  // waitFor는 콜백이 던지는 동안 다시 불러서, 조건을 expect로 적어요.
  const waitForUploads = () =>
    vi.waitFor(() => {
      const { total, uploaded, skipped, failed } = getState().imageUpload;
      expect(uploaded + skipped + failed).toBe(total);
    });
  const uploadedFileNames = () => vi.mocked(resizeFull).mock.calls.map(([file]) => file.name);
  const savedFileNames = () => vi.mocked(savePhotos).mock.calls[0][0].map((row) => row.fileName);

  beforeEach(() => {
    vi.mocked(resizeFull).mockResolvedValue(full);
    vi.mocked(savePhotoImage).mockResolvedValue();
    vi.mocked(savePhotos).mockImplementation(async (photos) => ({
      saved: photos.map((photo) => photo.id),
      skipped: [],
    }));
  });

  test('새 사진은 fileKey를 정해 저장하고, 미리 볼 수 있는 사진의 이미지만 올려요', async () => {
    // given: 두 번째 사진은 미리 볼 수 없음
    vi.mocked(resizeThumbnail).mockResolvedValueOnce(thumb).mockResolvedValueOnce(null);
    await pick(['a.jpg', 'b.heic']);
    vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.heic']));

    // when
    await getState().save('u1');
    await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

    // then
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    expect(rows[0].id).toMatch(/^p_[0-9a-f]{12}$/);
    expect(rows[0]).toMatchObject({ fileName: 'a.jpg', fileKey: `photos:u1/${rows[0].id}` });
    expect(rows[1]).toMatchObject({ fileName: 'b.heic', fileKey: null });
    expect(uploadedKeys()).toEqual([rows[0].fileKey]);
    expect(getState()).toMatchObject({
      saveStatus: 'saved',
      saveResult: { saved: 2, existing: 0 },
    });
  });

  test('이미 저장한 사진은 두 벌로 저장하지 않고, 다 올라간 이미지는 다시 올리지 않아요', async () => {
    // given: a는 전에 저장했고 이미지도 다 올라간 사진
    await pick(['a.jpg', 'b.jpg']);
    vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg']));
    vi.mocked(savePhotos).mockImplementation(async ([existing, fresh]) => ({
      saved: [fresh.id],
      skipped: [existing.id],
    }));
    vi.mocked(getMyData).mockResolvedValue({
      photos: [{ fileName: 'a.jpg', takenAt: TAKEN_AT, fileKey: 'photos:u1/p_old_a' }],
    });
    vi.mocked(getUploadedImagePaths).mockResolvedValue(
      new Set(['u1/full/p_old_a.webp', 'u1/thumb/p_old_a.webp']),
    );

    // when
    await getState().save('u1');
    await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

    // then
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    expect(uploadedKeys()).toEqual([rows[1].fileKey]);
    expect(getState().saveResult).toEqual({ saved: 1, existing: 1, unreadable: 0 });
  });

  describe('이어 올리기', () => {
    /** 전에 저장된 사진 행이에요. getMyData가 주는 모양이에요. */
    const savedRow = (fileName, fileKey) => ({ fileName, takenAt: TAKEN_AT, fileKey });
    /** 그 키의 이미지가 버킷에 올라간 경로예요. */
    const pathsOf = (fileKey, sizes = ['full', 'thumb']) => {
      const photoId = fileKey.split('/').at(-1);
      return sizes.map((size) => `u1/${size}/${photoId}.webp`);
    };

    beforeEach(() => {
      // 고른 사진이 전부 전에 저장한 사진이에요.
      vi.mocked(savePhotos).mockImplementation(async (photos) => ({
        saved: [],
        skipped: photos.map((photo) => photo.id),
      }));
    });

    test('전에 저장했지만 이미지가 없는 사진은 원래 fileKey로 이어서 올려요', async () => {
      // given: a는 다 올라갔고, b는 창을 닫아 못 올렸어요
      await pick(['a.jpg', 'b.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg']));
      vi.mocked(getMyData).mockResolvedValue({
        photos: [savedRow('a.jpg', 'photos:u1/p_old_a'), savedRow('b.jpg', 'photos:u1/p_old_b')],
      });
      vi.mocked(getUploadedImagePaths).mockResolvedValue(new Set(pathsOf('photos:u1/p_old_a')));

      // when
      await getState().save('u1');
      await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

      // then
      expect(uploadedKeys()).toEqual(['photos:u1/p_old_b']);
      expect(getState().imageUpload.total).toBe(1);
      expect(getState().saveResult).toEqual({ saved: 0, existing: 2, unreadable: 0 });
    });

    test('보기용·썸네일 중 하나만 올라간 사진도 다시 올려요', async () => {
      // given: 썸네일만 올라가고 보기용은 못 올렸어요
      await pick(['a.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));
      vi.mocked(getMyData).mockResolvedValue({ photos: [savedRow('a.jpg', 'photos:u1/p_old_a')] });
      vi.mocked(getUploadedImagePaths).mockResolvedValue(
        new Set(pathsOf('photos:u1/p_old_a', ['thumb'])),
      );

      // when
      await getState().save('u1');
      await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

      // then
      expect(uploadedKeys()).toEqual(['photos:u1/p_old_a']);
    });

    test('이미지 없이 저장한 사진과 데모 사진은 이어 올리지 않아요', async () => {
      // given
      await pick(['a.jpg', 'b.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg']));
      vi.mocked(getMyData).mockResolvedValue({
        photos: [savedRow('a.jpg', null), savedRow('b.jpg', 'demo:x/seojin/b.webp')],
      });
      vi.mocked(getUploadedImagePaths).mockResolvedValue(new Set());

      // when
      await getState().save('u1');

      // then
      expect(getState().saveStatus).toBe('saved');
      expect(getState().imageUpload.total).toBe(0);
      expect(savePhotoImage).not.toHaveBeenCalled();
    });

    test('이번에 미리 볼 수 없는 사진은 이어 올리지 않아요', async () => {
      // given: 전에 저장한 사진인데, 이번에 고른 파일은 썸네일을 못 만들었어요
      vi.mocked(resizeThumbnail).mockResolvedValue(null);
      await pick(['a.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));

      // when
      await getState().save('u1');

      // then: 올릴 수 없으니 저장된 행을 찾으러 가지도 않아요
      expect(getMyData).not.toHaveBeenCalled();
      expect(savePhotoImage).not.toHaveBeenCalled();
    });

    test('새로 저장한 사진만 있으면 저장된 행을 다시 받지 않아요', async () => {
      // given
      vi.mocked(savePhotos).mockImplementation(async (photos) => ({
        saved: photos.map((photo) => photo.id),
        skipped: [],
      }));
      await pick(['a.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));

      // when
      await getState().save('u1');
      await vi.waitFor(() => expect(getState().imageUpload.uploaded).toBe(1));

      // then
      expect(getMyData).not.toHaveBeenCalled();
      expect(getUploadedImagePaths).not.toHaveBeenCalled();
    });

    test('이어 올릴 사진을 찾는 도중 비우면 결과를 덮거나 이미지를 올리지 않아요', async () => {
      // given: 버킷 목록을 받는 중
      await pick(['a.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));
      vi.mocked(getMyData).mockResolvedValue({ photos: [savedRow('a.jpg', 'photos:u1/p_old_a')] });
      const listing = Promise.withResolvers();
      vi.mocked(getUploadedImagePaths).mockReturnValueOnce(listing.promise);
      const saving = getState().save('u1');
      await vi.waitFor(() => expect(getUploadedImagePaths).toHaveBeenCalled());

      // when
      getState().reset();
      listing.resolve(new Set());
      await saving;

      // then
      expect(getState()).toMatchObject({ saveStatus: 'idle', saveResult: null });
      expect(savePhotoImage).not.toHaveBeenCalled();
    });

    test('이어 올릴 사진을 못 찾으면 실패 상태가 돼요', async () => {
      // given
      await pick(['a.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));
      vi.mocked(getMyData).mockRejectedValue(new Error('네트워크'));
      vi.mocked(getUploadedImagePaths).mockResolvedValue(new Set());
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // when
      await getState().save('u1');

      // then
      expect(getState().saveStatus).toBe('failed');
      expect(savePhotoImage).not.toHaveBeenCalled();
    });
  });

  test('저장하지 못하면 실패 상태가 되고 이미지는 올리지 않아요', async () => {
    // given
    await pick(['a.jpg']);
    vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));
    vi.mocked(savePhotos).mockRejectedValue(new Error('네트워크'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // when
    await getState().save('u1');

    // then
    expect(getState().saveStatus).toBe('failed');
    expect(savePhotoImage).not.toHaveBeenCalled();
  });

  test('촬영 정보를 읽는 도중 비우면 DB에 저장하지 않아요', async () => {
    // given: 촬영 정보를 읽는 중
    await pick(['a.jpg']);
    const reading = Promise.withResolvers();
    vi.mocked(readPhotos).mockReturnValueOnce(reading.promise);
    const saving = getState().save('u1');

    // when
    getState().reset();
    reading.resolve(readResultOf(['a.jpg']));
    await saving;

    // then
    expect(savePhotos).not.toHaveBeenCalled();
    expect(getState().saveStatus).toBe('idle');
  });

  test('저장하는 도중 비우면 결과를 덮거나 이미지를 올리지 않아요', async () => {
    // given: 저장 요청이 끝나기 전
    await pick(['a.jpg']);
    vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg']));
    const pending = Promise.withResolvers();
    vi.mocked(savePhotos).mockReturnValueOnce(pending.promise);
    const saving = getState().save('u1');
    await vi.waitFor(() => expect(savePhotos).toHaveBeenCalled());

    // when
    getState().reset();
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    pending.resolve({ saved: rows.map((row) => row.id), skipped: [] });
    await saving;

    // then
    expect(getState()).toMatchObject({ saveStatus: 'idle', saveResult: null });
    expect(savePhotoImage).not.toHaveBeenCalled();
  });

  describe('정리 끝의 답', () => {
    test('빼 둔 사진은 저장하지 않아요', async () => {
      // given
      await pick(['a.jpg', 'b.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg']));
      getState().answerPass(getState().photos[1].id, 'exclude');

      // when
      await getState().save('u1');
      await waitForUploads();

      // then
      expect(savedFileNames()).toEqual(['a.jpg']);
      expect(getState().saveResult).toEqual({ saved: 1, existing: 0, unreadable: 0 });
    });

    test('빼 둔 사진 뒤의 사진도 제 원본으로 올려요', async () => {
      // given: 가운데를 빼면 c의 고른 순서가 밀리기 쉬워요
      await pick(['a.jpg', 'b.jpg', 'c.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg', 'c.jpg']));
      getState().answerPass(getState().photos[1].id, 'exclude');

      // when
      await getState().save('u1');
      await waitForUploads();

      // then
      const [[rows]] = vi.mocked(savePhotos).mock.calls;
      expect(uploadedFileNames()).toEqual(['a.jpg', 'c.jpg']);
      expect(uploadedKeys()).toEqual(rows.map((row) => row.fileKey));
    });

    test('나중에 하기로 한 사진은 저장하고 이미지도 올려요', async () => {
      // given
      await pick(['a.jpg', 'b.jpg']);
      vi.mocked(readPhotos).mockResolvedValue(readResultOf(['a.jpg', 'b.jpg']));
      getState().answerPass(getState().photos[1].id, 'later');

      // when
      await getState().save('u1');
      await waitForUploads();

      // then
      expect(savedFileNames()).toEqual(['a.jpg', 'b.jpg']);
      expect(uploadedFileNames()).toEqual(['a.jpg', 'b.jpg']);
    });
  });
});

describe('saveTarget', () => {
  beforeEach(() => {
    vi.mocked(savePhotos).mockResolvedValue({ saved: [], skipped: [] });
  });

  test('save에 넘긴 곳을 두고, 넘기지 않으면 여행 보기예요', async () => {
    await getState().start([photoFile('a.jpg')]);
    vi.mocked(readPhotos).mockResolvedValue({ photos: [], skipped: [], counts: {} });

    await getState().save('u1', 'sort');
    expect(getState().saveTarget).toBe('sort');

    await getState().save('u1');
    expect(getState().saveTarget).toBe('trip');
  });

  test('reset하면 여행 보기로 돌아가요', async () => {
    await getState().start([photoFile('a.jpg')]);
    vi.mocked(readPhotos).mockResolvedValue({ photos: [], skipped: [], counts: {} });
    await getState().save('u1', 'sort');

    getState().reset();

    expect(getState().saveTarget).toBe('trip');
  });
});

describe('refreshJourney', () => {
  test('save가 끝나면 이미지 올리기와 함께 Journey를 만들기 시작해요', async () => {
    // given
    vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
    vi.mocked(savePhotoImage).mockResolvedValue();
    vi.mocked(savePhotos).mockImplementation(async (photos) => ({
      saved: photos.map((photo) => photo.id),
      skipped: [],
    }));
    await getState().start([photoFile('a.jpg')]);
    vi.mocked(readPhotos).mockResolvedValue({
      photos: [{ order: 0, fileName: 'a.jpg', takenAt: null, dedupeKey: '|a.jpg' }],
      skipped: [],
    });
    const building = Promise.withResolvers();
    vi.mocked(refreshJourney).mockReturnValue(building.promise);

    // when
    await getState().save('u1');

    // then: 이미지를 기다리지 않고 바로 만들기 시작해요
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
    expect(getState().journeyStatus).toBe('building');
    building.resolve(EMPTY_JOURNEY);
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
  });

  test('다 만들면 새로 저장한 사진이 든 여행을 newTripId에 둬요', async () => {
    // given: 'a.jpg'를 새로 저장했고, Journey에서 그 사진이 일본 여행에 들어감
    vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
    vi.mocked(savePhotoImage).mockResolvedValue();
    vi.mocked(savePhotos).mockImplementation(async (photos) => ({
      saved: photos.map((photo) => photo.id),
      skipped: [],
    }));
    await getState().start([photoFile('a.jpg')]);
    vi.mocked(readPhotos).mockResolvedValue({
      photos: [{ order: 0, fileName: 'a.jpg', takenAt: null, dedupeKey: '|a.jpg' }],
      skipped: [],
    });
    vi.mocked(refreshJourney).mockImplementation(async () => ({
      stops: [{ id: 'tokyo', photoIds: getState().newPhotoIds }],
      trips: [{ id: 'japan', stopIds: ['tokyo'] }],
    }));

    // when
    await getState().save('u1');

    // then
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
    expect(getState().newTripId).toBe('japan');
  });

  test('실패하면 failed가 되고, 다시 부르면 다시 만들어요', async () => {
    // given
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(refreshJourney)
      .mockRejectedValueOnce({ status: 0, code: 'SAVE_FAILED', message: '0행' })
      .mockResolvedValueOnce(EMPTY_JOURNEY);

    // when
    await getState().refreshJourney('u1');

    // then
    expect(getState().journeyStatus).toBe('failed');
    await getState().refreshJourney('u1');
    expect(getState().journeyStatus).toBe('saved');
    expect(refreshJourney).toHaveBeenCalledTimes(2);
  });

  test('만드는 도중 비우면 결과로 상태를 덮지 않아요', async () => {
    // given
    const building = Promise.withResolvers();
    vi.mocked(refreshJourney).mockReturnValue(building.promise);
    const making = getState().refreshJourney('u1');

    // when
    getState().reset();
    building.resolve();
    await making;

    // then
    expect(getState().journeyStatus).toBe('idle');
  });

  test('실패하는 도중 비워도 failed로 덮지 않아요', async () => {
    // given
    const building = Promise.withResolvers();
    vi.mocked(refreshJourney).mockReturnValue(building.promise);
    const making = getState().refreshJourney('u1');

    // when
    getState().reset();
    building.reject(new Error('네트워크'));
    await making;

    // then
    expect(getState().journeyStatus).toBe('idle');
  });
});
