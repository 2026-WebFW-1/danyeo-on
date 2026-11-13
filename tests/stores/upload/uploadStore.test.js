import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getMyData,
  getUploadedImagePaths,
  savePhotoImage,
  savePhotos,
} from '@/services/photoService';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { readPhotos } from '@/utils/upload/readPhotos';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn(), resizeFull: vi.fn() }));
vi.mock('@/utils/upload/readPhotos', () => ({ readPhotos: vi.fn() }));
vi.mock('@/services/photoService', () => ({
  getMyData: vi.fn(),
  getUploadedImagePaths: vi.fn(),
  savePhotoImage: vi.fn(),
  savePhotos: vi.fn(),
}));

const { getState } = useUploadStore;
const photoFile = (name) => new File(['사진'], name, { type: 'image/jpeg' });
const thumb = new Blob(['썸네일'], { type: 'image/webp' });

beforeEach(() => {
  getState().reset();
  vi.mocked(resizeThumbnail).mockResolvedValue(thumb);
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
    expect(getState().saveResult).toEqual({ saved: 1, existing: 1 });
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
      expect(getState().saveResult).toEqual({ saved: 0, existing: 2 });
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
});
