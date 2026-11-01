import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { savePhotoImage } from '@/services/photoService';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn(), resizeFull: vi.fn() }));
vi.mock('@/services/photoService', () => ({ savePhotoImage: vi.fn() }));

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

    // then: 이미 시작한 3장 말고는 올리지 않아요
    expect(savePhotoImage).toHaveBeenCalledTimes(3);
    expect(getState().imageUpload).toEqual({ total: 0, uploaded: 0, skipped: 0, failed: 0 });
  });
});
