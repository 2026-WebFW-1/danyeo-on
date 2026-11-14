import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { addCorrection, getCorrections, removeCorrection } from '@/services/correctionService';
import { useAuthStore } from '@/stores/authStore';
import { getExcludeKey, useCorrectionStore } from '@/stores/correctionStore';

vi.mock('@/services/correctionService', () => ({
  getCorrections: vi.fn(),
  addCorrection: vi.fn(),
  removeCorrection: vi.fn(),
}));

const { getState } = useCorrectionStore;
const NOW = '2026-11-14T03:00:00.000Z';
const rename = {
  id: 'c_seojin_1',
  ownerId: 'u1',
  type: 'rename',
  anchorPhotoId: 'p_a',
  name: '졸업 여행',
  createdAt: '2026-10-01T12:00:00Z',
};
const exclude = {
  id: 'c_seojin_2',
  ownerId: 'u1',
  type: 'exclude',
  photoId: 'p_b',
  createdAt: '2026-10-02T12:00:00Z',
};
const SAVE_FAILED = { status: 500, code: 'SAVE_FAILED', message: '서버 오류' };

/** 끝나는 때를 테스트가 정하는 약속이에요. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function fetchSaved() {
  vi.mocked(getCorrections).mockResolvedValue([rename, exclude]);
  await getState().fetch();
}

beforeEach(() => {
  getState().reset();
  useAuthStore.setState({ user: { id: 'u1' } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  useAuthStore.setState({ user: null });
});

describe('fetch', () => {
  test('불러오면 보정을 만든 순서 그대로 두고 ready가 돼요', async () => {
    await fetchSaved();

    expect(getState().corrections).toEqual([rename, exclude]);
    expect(getState().status).toBe('ready');
    expect(getState().error).toBeNull();
  });

  test('실패하면 던지지 않고 error로 남겨요', async () => {
    const error = { status: 0, code: 'LOAD_FAILED', message: '연결 실패' };
    vi.mocked(getCorrections).mockRejectedValue(error);

    await getState().fetch();

    expect(getState().status).toBe('error');
    expect(getState().error).toEqual(error);
    expect(getState().corrections).toEqual([]);
  });

  test('불러오는 중에 또 부르면 요청을 늘리지 않아요', async () => {
    const pending = deferred();
    vi.mocked(getCorrections).mockReturnValue(pending.promise);

    const first = getState().fetch();
    await getState().fetch();
    pending.resolve([]);
    await first;

    expect(getCorrections).toHaveBeenCalledTimes(1);
  });

  test('불러오는 사이에 reset하면(계정 바뀜) 앞 계정의 보정을 버려요', async () => {
    const pending = deferred();
    vi.mocked(getCorrections).mockReturnValue(pending.promise);

    const request = getState().fetch();
    getState().reset();
    pending.resolve([rename]);
    await request;

    expect(getState().corrections).toEqual([]);
    expect(getState().status).toBe('idle');
  });
});

describe('add', () => {
  test('저장이 끝나면 id · ownerId · createdAt을 붙여 목록 끝에 더하고 그 보정을 돌려줘요', async () => {
    await fetchSaved();
    vi.useFakeTimers({ now: new Date(NOW) });
    vi.mocked(addCorrection).mockResolvedValue();

    const added = await getState().add({
      type: 'rename',
      anchorPhotoId: 'p_c',
      name: '여수 · 순천',
    });

    expect(added).toEqual({
      id: expect.stringMatching(/^c_[0-9a-f]{12}$/),
      ownerId: 'u1',
      type: 'rename',
      anchorPhotoId: 'p_c',
      name: '여수 · 순천',
      createdAt: NOW,
    });
    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('서버에는 id와 보낸 칸만 보내요(ownerId · createdAt은 서버가 정해요)', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockResolvedValue();

    const added = await getState().add({ type: 'mode', fromPhotoId: 'p_c', mode: 'car' });

    expect(addCorrection).toHaveBeenCalledWith({
      id: added.id,
      type: 'mode',
      fromPhotoId: 'p_c',
      mode: 'car',
    });
  });

  test('실패하면 목록을 그대로 두고 받은 오류를 던져요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockRejectedValue(SAVE_FAILED);

    await expect(getState().add({ type: 'exclude', photoId: 'p_c' })).rejects.toEqual(SAVE_FAILED);

    expect(getState().corrections).toEqual([rename, exclude]);
    expect(getState().pending).toEqual({});
  });

  test('불러오기 전에는 저장하지 않고 던져요', async () => {
    await expect(getState().add({ type: 'exclude', photoId: 'p_c' })).rejects.toThrow(
      '보정을 불러온 뒤에',
    );

    expect(addCorrection).not.toHaveBeenCalled();
  });

  test('이미 뺀 사진을 또 빼면 서버에 보내지 않고 있는 보정을 돌려줘요', async () => {
    await fetchSaved();

    const added = await getState().add({ type: 'exclude', photoId: 'p_b' });

    expect(added).toBe(exclude);
    expect(addCorrection).not.toHaveBeenCalled();
    expect(getState().corrections).toEqual([rename, exclude]);
  });

  test('사진을 빼는 동안 pending에 표시하고, 같은 사진을 또 빼면 던져요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(addCorrection).mockReturnValue(pending.promise);

    const first = getState().add({ type: 'exclude', photoId: 'p_c' });
    expect(getState().pending).toEqual({ [getExcludeKey('p_c')]: true });
    await expect(getState().add({ type: 'exclude', photoId: 'p_c' })).rejects.toThrow(
      '이미 빼는 중인 사진',
    );
    pending.resolve();
    await first;

    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(getState().pending).toEqual({});
  });

  test('이름은 같은 사진으로 여러 번 바꿔도 쌓아요(마지막 보정이 이겨요)', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockResolvedValue();

    const added = await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '새 이름' });

    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('저장하는 사이에 reset하면(계정 바뀜) 새 계정의 목록에 붙이지 않아요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(addCorrection).mockReturnValue(pending.promise);

    const request = getState().add({ type: 'exclude', photoId: 'p_c' });
    getState().reset();
    pending.resolve();
    await request;

    expect(getState().corrections).toEqual([]);
    expect(getState().pending).toEqual({});
  });
});

describe('remove', () => {
  test('지우면 목록에서 빠져요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(true);

    await getState().remove(exclude.id);

    expect(removeCorrection).toHaveBeenCalledWith(exclude.id);
    expect(getState().corrections).toEqual([rename]);
    expect(getState().pending).toEqual({});
  });

  test('서버에 이미 없던 보정도 목록에서 빼요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(false);

    await getState().remove(exclude.id);

    expect(getState().corrections).toEqual([rename]);
  });

  test('실패하면 목록을 그대로 두고 받은 오류를 던져요', async () => {
    await fetchSaved();
    const error = { status: 0, code: 'REMOVE_FAILED', message: '연결 실패' };
    vi.mocked(removeCorrection).mockRejectedValue(error);

    await expect(getState().remove(exclude.id)).rejects.toEqual(error);

    expect(getState().corrections).toEqual([rename, exclude]);
    expect(getState().pending).toEqual({});
  });

  test('지우는 동안 pending에 표시하고, 같은 보정을 또 지우면 던져요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(removeCorrection).mockReturnValue(pending.promise);

    const first = getState().remove(exclude.id);
    expect(getState().pending).toEqual({ [exclude.id]: true });
    await expect(getState().remove(exclude.id)).rejects.toThrow('이미 지우는 중인 보정');
    pending.resolve(true);
    await first;

    expect(removeCorrection).toHaveBeenCalledTimes(1);
  });

  test('뺀 사진을 되돌린 뒤에는 그 사진을 다시 뺄 수 있어요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(true);
    vi.mocked(addCorrection).mockResolvedValue();

    await getState().remove(exclude.id);
    const added = await getState().add({ type: 'exclude', photoId: 'p_b' });

    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(getState().corrections).toEqual([rename, added]);
  });
});

describe('reset', () => {
  test('처음 상태로 돌아가요', async () => {
    await fetchSaved();

    getState().reset();

    expect(getState()).toMatchObject({ corrections: [], status: 'idle', error: null, pending: {} });
  });
});
