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
const ACCOUNT_CHANGED = {
  status: 0,
  code: 'ACCOUNT_CHANGED',
  message: '요청하는 사이에 계정이 바뀌었어요',
};

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

  test('사진을 빼는 동안 pending에 표시하고, 같은 사진을 또 빼도 한 번만 보내요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(addCorrection).mockReturnValue(pending.promise);

    const first = getState().add({ type: 'exclude', photoId: 'p_c' });
    const second = getState().add({ type: 'exclude', photoId: 'p_c' });
    expect(getState().pending).toEqual({ [getExcludeKey('p_c')]: true });
    pending.resolve();

    expect(await second).toBe(await first);
    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(getState().corrections).toHaveLength(3);
    expect(getState().pending).toEqual({});
  });

  test('앞 요청이 실패해 뒤 요청이 다시 보내는 동안에도 pending에 남아 있어요', async () => {
    await fetchSaved();
    const failing = deferred();
    const retrying = deferred();
    vi.mocked(addCorrection)
      .mockReturnValueOnce(failing.promise)
      .mockReturnValueOnce(retrying.promise);

    const first = getState().add({ type: 'exclude', photoId: 'p_c' });
    const second = getState().add({ type: 'exclude', photoId: 'p_c' });
    failing.reject(SAVE_FAILED);
    await expect(first).rejects.toEqual(SAVE_FAILED);
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(2));

    expect(getState().pending).toEqual({ [getExcludeKey('p_c')]: true });

    retrying.resolve();
    await second;
    expect(getState().pending).toEqual({});
  });

  test('겹쳐 불러도 부른 순서대로 하나씩 보내고, 목록에도 그 순서로 붙어요', async () => {
    await fetchSaved();
    const slow = deferred();
    vi.mocked(addCorrection).mockReturnValueOnce(slow.promise).mockResolvedValueOnce();

    const first = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '먼저 누른 이름' });
    const second = getState().add({
      type: 'rename',
      anchorPhotoId: 'p_a',
      name: '나중에 누른 이름',
    });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    // 앞 요청이 끝나기 전에는 뒤 요청을 보내지 않아요.
    await Promise.resolve();
    expect(addCorrection).toHaveBeenCalledTimes(1);

    slow.resolve();
    await Promise.all([first, second]);

    expect(getState().corrections.map((correction) => correction.name)).toEqual([
      '졸업 여행',
      undefined,
      '먼저 누른 이름',
      '나중에 누른 이름',
    ]);
  });

  test('앞 요청이 실패해도 뒤 요청은 보내요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockRejectedValueOnce(SAVE_FAILED).mockResolvedValueOnce();

    const first = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '실패' });
    const second = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '성공' });

    await expect(first).rejects.toEqual(SAVE_FAILED);
    const added = await second;
    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('되돌리는 중인 사진을 다시 빼면, 지우기가 끝난 뒤 새 보정으로 저장해요', async () => {
    await fetchSaved();
    const removing = deferred();
    vi.mocked(removeCorrection).mockReturnValue(removing.promise);
    vi.mocked(addCorrection).mockResolvedValue();

    const removed = getState().remove(exclude.id);
    const readded = getState().add({ type: 'exclude', photoId: 'p_b' });
    removing.resolve(true);
    await removed;
    const added = await readded;

    expect(added.id).not.toBe(exclude.id);
    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(getState().corrections).toEqual([rename, added]);
  });

  test('되돌리기가 실패했으면, 다시 뺄 때 남아 있는 보정을 돌려줘요', async () => {
    await fetchSaved();
    const error = { status: 0, code: 'REMOVE_FAILED', message: '연결 실패' };
    vi.mocked(removeCorrection).mockRejectedValue(error);

    const removed = getState().remove(exclude.id);
    const readded = getState().add({ type: 'exclude', photoId: 'p_b' });

    await expect(removed).rejects.toEqual(error);
    expect(await readded).toBe(exclude);
    expect(addCorrection).not.toHaveBeenCalled();
  });

  test('이름은 같은 사진으로 여러 번 바꿔도 쌓아요(마지막 보정이 이겨요)', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockResolvedValue();

    const added = await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '새 이름' });

    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('저장하는 사이에 reset하면(계정 바뀜) 성공으로 돌려주지 않고 ACCOUNT_CHANGED로 던져요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(addCorrection).mockReturnValue(pending.promise);

    const request = getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    useAuthStore.setState({ user: { id: 'u2' } });
    pending.resolve();

    await expect(request).rejects.toEqual(ACCOUNT_CHANGED);
    expect(getState().corrections).toEqual([]);
    expect(getState().pending).toEqual({});
  });

  test('차례를 기다리는 사이에 reset하면(계정 바뀜) 서버에 보내지 않아요', async () => {
    await fetchSaved();
    const slow = deferred();
    vi.mocked(addCorrection).mockReturnValue(slow.promise);

    const first = getState().add({ type: 'exclude', photoId: 'p_c' });
    const waiting = getState().add({ type: 'exclude', photoId: 'p_d' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    slow.resolve();

    await expect(first).rejects.toEqual(ACCOUNT_CHANGED);
    await expect(waiting).rejects.toEqual(ACCOUNT_CHANGED);
    expect(addCorrection).toHaveBeenCalledTimes(1);
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

  test('지우는 동안 pending에 표시하고, 같은 보정을 또 지워도 한 번만 보내요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(removeCorrection).mockReturnValue(pending.promise);

    const first = getState().remove(exclude.id);
    const second = getState().remove(exclude.id);
    expect(getState().pending).toEqual({ [exclude.id]: true });
    pending.resolve(true);
    await Promise.all([first, second]);

    expect(removeCorrection).toHaveBeenCalledTimes(1);
    expect(getState().corrections).toEqual([rename]);
    expect(getState().pending).toEqual({});
  });

  test('지우는 사이에 reset하면(계정 바뀜) ACCOUNT_CHANGED로 던져요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(removeCorrection).mockReturnValue(pending.promise);

    const request = getState().remove(exclude.id);
    await vi.waitFor(() => expect(removeCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    pending.resolve(true);

    await expect(request).rejects.toEqual(ACCOUNT_CHANGED);
    expect(getState().pending).toEqual({});
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

  test('같은 계정으로 다시 들어오면, 나가기 전에 보낸 요청이 끝난 뒤에 보내요', async () => {
    await fetchSaved();
    const before = deferred();
    vi.mocked(addCorrection).mockReturnValueOnce(before.promise).mockResolvedValueOnce();

    const previous = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '나가기 전' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    await fetchSaved();

    const next = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '다시 들어와서' });
    await Promise.resolve();
    expect(addCorrection).toHaveBeenCalledTimes(1);

    before.resolve();
    await expect(previous).rejects.toEqual(ACCOUNT_CHANGED);
    const added = await next;

    expect(addCorrection).toHaveBeenCalledTimes(2);
    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('앞 계정의 요청이 끝나지 않아도 새 계정의 저장은 기다리지 않아요', async () => {
    await fetchSaved();
    const stuck = deferred();
    vi.mocked(addCorrection).mockReturnValueOnce(stuck.promise).mockResolvedValueOnce();

    const previous = getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    useAuthStore.setState({ user: { id: 'u2' } });
    vi.mocked(getCorrections).mockResolvedValue([]);
    await getState().fetch();

    const added = await getState().add({ type: 'exclude', photoId: 'p_x' });

    expect(added.ownerId).toBe('u2');
    expect(getState().corrections).toEqual([added]);

    // 앞 계정의 요청은 뒤늦게 끝나도 새 계정의 목록을 건드리지 않아요.
    stuck.resolve();
    await expect(previous).rejects.toEqual(ACCOUNT_CHANGED);
    expect(getState().corrections).toEqual([added]);
    expect(getState().pending).toEqual({});
  });
});
