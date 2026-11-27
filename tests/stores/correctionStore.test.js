import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  addCorrection,
  getCorrections,
  moveCorrectionPhoto,
  removeCorrection,
} from '@/services/correctionService';
import { refreshJourney } from '@/services/journeyService';
import { useAuthStore } from '@/stores/authStore';
import { getExcludeKey, useCorrectionStore } from '@/stores/correctionStore';

vi.mock('@/services/correctionService', () => ({
  getCorrections: vi.fn(),
  addCorrection: vi.fn(),
  removeCorrection: vi.fn(),
  moveCorrectionPhoto: vi.fn(),
}));
vi.mock('@/services/journeyService', () => ({ refreshJourney: vi.fn() }));

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

// 서버는 저장된 보정의 id를 돌려줘요. 보통은 보낸 id 그대로예요.
const echoId = async (fields) => fields.id;
const echoAfter = (promise) => async (fields) => {
  await promise;
  return fields.id;
};

// 늦게 끝난 계산이 상태를 바꾸지 않는지 볼 때, 그 계산의 뒤처리가 다 돌 때까지 기다려요.
const flushTasks = () => new Promise((resolve) => setTimeout(resolve, 0));

async function fetchSaved() {
  vi.mocked(getCorrections).mockResolvedValue([rename, exclude]);
  await getState().fetch();
}

beforeEach(() => {
  getState().reset();
  useAuthStore.setState({ user: { id: 'u1' } });
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
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
  test('같은 여행 쌍을 저장 중 다시 보내도 보정과 재계산은 한 번이에요', async () => {
    // given
    await fetchSaved();
    const saving = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(saving.promise));
    const input = { type: 'merge', photoIds: ['b', 'c'] };
    // when
    const first = getState().add(input);
    const second = getState().add({ ...input, photoIds: [...input.photoIds] });
    expect(Object.keys(getState().pending)).toHaveLength(1);
    saving.resolve();
    // then
    const [a, b] = await Promise.all([first, second]);
    expect(a.id).toBe(b.id);
    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(refreshJourney).toHaveBeenCalledTimes(1);
    expect(getState().pending).toEqual({});
  });

  test('저장이 끝나면 id · ownerId · createdAt을 붙여 목록 끝에 더하고 그 보정을 돌려줘요', async () => {
    await fetchSaved();
    vi.useFakeTimers({ now: new Date(NOW) });
    vi.mocked(addCorrection).mockImplementation(echoId);

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
    vi.mocked(addCorrection).mockImplementation(echoId);

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

  test('다른 탭에서 먼저 뺀 사진이면 서버가 준 id로 목록에 붙이고, 그 id로 복구해요', async () => {
    await fetchSaved();
    vi.useFakeTimers({ now: new Date(NOW) });
    vi.mocked(addCorrection).mockResolvedValue('c_other_tab');
    vi.mocked(removeCorrection).mockResolvedValue(true);

    const added = await getState().add({ type: 'exclude', photoId: 'p_c' });

    expect(added).toEqual({
      id: 'c_other_tab',
      ownerId: 'u1',
      type: 'exclude',
      photoId: 'p_c',
      createdAt: NOW,
    });
    expect(getState().corrections).toEqual([rename, exclude, added]);

    await getState().remove(added.id);

    expect(removeCorrection).toHaveBeenCalledWith('c_other_tab');
    expect(getState().corrections).toEqual([rename, exclude]);
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
    vi.mocked(addCorrection).mockImplementation(echoAfter(pending.promise));

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
      .mockImplementationOnce(echoAfter(failing.promise))
      .mockImplementationOnce(echoAfter(retrying.promise));

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
    vi.mocked(addCorrection)
      .mockImplementationOnce(echoAfter(slow.promise))
      .mockImplementationOnce(echoId);

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
    vi.mocked(addCorrection).mockRejectedValueOnce(SAVE_FAILED).mockImplementationOnce(echoId);

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
    vi.mocked(addCorrection).mockImplementation(echoId);

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
    vi.mocked(addCorrection).mockImplementation(echoId);

    const added = await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '새 이름' });

    expect(getState().corrections).toEqual([rename, exclude, added]);
  });

  test('저장하는 사이에 reset하면(계정 바뀜) 성공으로 돌려주지 않고 ACCOUNT_CHANGED로 던져요', async () => {
    await fetchSaved();
    const pending = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(pending.promise));

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
    vi.mocked(addCorrection).mockImplementation(echoAfter(slow.promise));

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
    vi.mocked(addCorrection).mockImplementation(echoId);

    await getState().remove(exclude.id);
    const added = await getState().add({ type: 'exclude', photoId: 'p_b' });

    expect(addCorrection).toHaveBeenCalledTimes(1);
    expect(getState().corrections).toEqual([rename, added]);
  });
});

describe('addMany', () => {
  test('준 순서대로 하나씩 저장하고, Journey 계산은 끝에 한 번만 시작해요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    vi.mocked(refreshJourney).mockResolvedValue();

    const added = await getState().addMany([
      { type: 'rename', anchorPhotoId: 'p_c', name: '졸업 여행' },
      { type: 'exclude', photoId: 'p_a' },
      { type: 'exclude', photoId: 'p_d' },
    ]);

    expect(vi.mocked(addCorrection).mock.calls.map(([fields]) => fields.type)).toEqual([
      'rename',
      'exclude',
      'exclude',
    ]);
    expect(getState().corrections.slice(2)).toEqual(added);
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
  });

  test('이미 뺀 사진은 보내지 않고 있는 보정을 돌려줘요. 보낸 게 없으면 계산하지 않아요', async () => {
    await fetchSaved();

    const added = await getState().addMany([{ type: 'exclude', photoId: 'p_b' }]);

    expect(added).toEqual([exclude]);
    expect(addCorrection).not.toHaveBeenCalled();
    expect(refreshJourney).not.toHaveBeenCalled();
  });

  test('중간에 실패하면 멈추고 던지지만, 앞서 저장한 보정은 남기고 그만큼 계산해요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementationOnce(echoId).mockRejectedValueOnce(SAVE_FAILED);
    vi.mocked(refreshJourney).mockResolvedValue();

    await expect(
      getState().addMany([
        { type: 'exclude', photoId: 'p_c' },
        { type: 'exclude', photoId: 'p_d' },
        { type: 'exclude', photoId: 'p_e' },
      ]),
    ).rejects.toEqual(SAVE_FAILED);

    expect(addCorrection).toHaveBeenCalledTimes(2);
    expect(getState().corrections.map((correction) => correction.photoId)).toContain('p_c');
    expect(getState().corrections.map((correction) => correction.photoId)).not.toContain('p_d');
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
  });

  test('빼는 동안 사진마다 pending에 표시하고, 끝나면 지워요', async () => {
    await fetchSaved();
    const saving = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(saving.promise));
    vi.mocked(refreshJourney).mockResolvedValue();

    const adding = getState().addMany([{ type: 'exclude', photoId: 'p_c' }]);
    expect(getState().pending[getExcludeKey('p_c')]).toBe(true);

    saving.resolve();
    await adding;
    expect(getState().pending).toEqual({});
  });

  test('불러오기 전에는 저장하지 않고 던져요', async () => {
    await expect(getState().addMany([{ type: 'exclude', photoId: 'p_c' }])).rejects.toThrow();
    expect(addCorrection).not.toHaveBeenCalled();
  });

  test('저장하는 사이에 reset하면(계정 바뀜) ACCOUNT_CHANGED로 던지고 계산하지 않아요', async () => {
    await fetchSaved();
    const saving = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(saving.promise));

    const adding = getState().addMany([{ type: 'exclude', photoId: 'p_c' }]);
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalled());
    getState().reset();
    saving.resolve();

    await expect(adding).rejects.toEqual(ACCOUNT_CHANGED);
    expect(refreshJourney).not.toHaveBeenCalled();
  });
});

describe('removeMany', () => {
  test('차례로 지우고, Journey 계산은 끝에 한 번만 시작해요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(true);
    vi.mocked(refreshJourney).mockResolvedValue();

    await getState().removeMany([rename.id, exclude.id]);

    expect(vi.mocked(removeCorrection).mock.calls).toEqual([[rename.id], [exclude.id]]);
    expect(getState().corrections).toEqual([]);
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
  });

  test('중간에 실패하면 던지지만, 앞서 지운 보정은 빠지고 그만큼 계산해요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValueOnce(true).mockRejectedValueOnce(SAVE_FAILED);
    vi.mocked(refreshJourney).mockResolvedValue();

    await expect(getState().removeMany([rename.id, exclude.id])).rejects.toEqual(SAVE_FAILED);

    expect(getState().corrections).toEqual([exclude]);
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
    expect(getState().pending).toEqual({});
  });

  test('목록에 없는 보정만 있으면 보내지 않고 계산하지 않아요', async () => {
    await fetchSaved();

    await getState().removeMany(['c_gone']);

    expect(removeCorrection).not.toHaveBeenCalled();
    expect(refreshJourney).not.toHaveBeenCalled();
  });
});

describe('moveAnchors', () => {
  const split = {
    id: 'c_split',
    ownerId: 'u1',
    type: 'split',
    beforePhotoId: 'p_b',
    createdAt: '2026-10-03T12:00:00Z',
  };
  const merge = {
    id: 'c_merge',
    ownerId: 'u1',
    type: 'merge',
    photoIds: ['p_b', 'p_d'],
    createdAt: '2026-10-04T12:00:00Z',
  };

  async function fetchWithAnchors() {
    vi.mocked(getCorrections).mockResolvedValue([exclude, split, merge]);
    await getState().fetch();
  }

  test('차례로 서버에 보내고, 목록의 split · merge 사진도 바꿔요. Journey 계산은 하지 않아요', async () => {
    // given
    await fetchWithAnchors();
    vi.mocked(moveCorrectionPhoto).mockResolvedValue(true);

    // when
    const moved = await getState().moveAnchors(() => [
      { correctionId: 'c_split', fromPhotoId: 'p_b', toPhotoId: 'p_c' },
      { correctionId: 'c_merge', fromPhotoId: 'p_b', toPhotoId: 'p_a' },
    ]);

    // then
    expect(vi.mocked(moveCorrectionPhoto).mock.calls).toEqual([
      ['c_split', 'p_b', 'p_c'],
      ['c_merge', 'p_b', 'p_a'],
    ]);
    expect(getState().corrections).toEqual([
      exclude,
      { ...split, beforePhotoId: 'p_c' },
      { ...merge, photoIds: ['p_a', 'p_d'] },
    ]);
    expect(moved).toHaveLength(2);
    expect(refreshJourney).not.toHaveBeenCalled();
  });

  test('옮길 것은 앞선 요청이 끝난 뒤의 보정 목록으로 정해요', async () => {
    // given: 앞 요청이 split을 p_b → p_c로 옮기는 중
    await fetchWithAnchors();
    const first = deferred();
    vi.mocked(moveCorrectionPhoto).mockReturnValueOnce(first.promise).mockResolvedValue(true);
    const seen = [];
    const firstMoving = getState().moveAnchors(() => [
      { correctionId: 'c_split', fromPhotoId: 'p_b', toPhotoId: 'p_c' },
    ]);
    const secondMoving = getState().moveAnchors((corrections) => {
      seen.push(corrections.find((correction) => correction.id === 'c_split').beforePhotoId);
      return [];
    });

    // when
    first.resolve(true);
    await Promise.all([firstMoving, secondMoving]);

    // then
    expect(seen).toEqual(['p_c']);
  });

  test('중간에 실패하면 앞서 옮긴 것을 되돌려 놓고 던져요', async () => {
    // given
    await fetchWithAnchors();
    vi.mocked(moveCorrectionPhoto)
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(SAVE_FAILED)
      .mockResolvedValueOnce(true);

    // when
    const moving = getState().moveAnchors(() => [
      { correctionId: 'c_split', fromPhotoId: 'p_b', toPhotoId: 'p_c' },
      { correctionId: 'c_merge', fromPhotoId: 'p_b', toPhotoId: 'p_a' },
    ]);

    // then
    await expect(moving).rejects.toEqual(SAVE_FAILED);
    expect(vi.mocked(moveCorrectionPhoto).mock.calls.at(-1)).toEqual(['c_split', 'p_c', 'p_b']);
    expect(getState().corrections).toEqual([exclude, split, merge]);
  });

  test('옮길 게 없으면 보내지 않아요', async () => {
    // when
    await getState().moveAnchors(() => []);

    // then
    expect(moveCorrectionPhoto).not.toHaveBeenCalled();
  });
});

describe('Journey 다시 계산', () => {
  const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: '연결 실패' };

  test('저장이 끝나면 그 계정의 Journey 계산을 시작하고, add는 계산을 기다리지 않아요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const building = deferred();
    vi.mocked(refreshJourney).mockReturnValue(building.promise);

    const added = await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '새 이름' });

    expect(getState().corrections).toContain(added);
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
    expect(getState().journeyStatus).toBe('building');

    building.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
  });

  test('지운 뒤에도 Journey 계산을 시작해요', async () => {
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(true);
    vi.mocked(refreshJourney).mockResolvedValue();

    await getState().remove(exclude.id);

    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
  });

  test('서버에 보내지 않았거나 저장에 실패하면 계산하지 않아요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockRejectedValue(SAVE_FAILED);

    // 이미 뺀 사진은 서버에 보내지 않아요.
    await getState().add({ type: 'exclude', photoId: 'p_b' });
    await expect(getState().add({ type: 'exclude', photoId: 'p_c' })).rejects.toEqual(SAVE_FAILED);

    expect(refreshJourney).not.toHaveBeenCalled();
    expect(getState().journeyStatus).toBe('idle');
  });

  test('계산이 실패해도 보정은 저장된 채로 두고 failed로 남겨요. 다시 시도하면 지금 계정으로 계산해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    vi.mocked(refreshJourney).mockRejectedValueOnce(LOAD_FAILED).mockResolvedValueOnce();

    const added = await getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('failed'));
    expect(getState().corrections).toEqual([rename, exclude, added]);

    await getState().refreshJourney();

    expect(refreshJourney).toHaveBeenCalledTimes(2);
    expect(refreshJourney).toHaveBeenLastCalledWith('u1');
    expect(getState().journeyStatus).toBe('saved');
  });

  test('연달아 고치면 앞 계산이 늦게 끝나도 마지막 계산의 상태를 따라가요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const first = deferred();
    const second = deferred();
    vi.mocked(refreshJourney)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '먼저' });
    await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '나중' });
    expect(refreshJourney).toHaveBeenCalledTimes(2);

    second.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
    first.reject(LOAD_FAILED);
    await flushTasks();

    expect(getState().journeyStatus).toBe('saved');
  });

  test('계산하는 사이에 계정이 바뀌면 앞 계정의 결과를 새 계정의 상태로 남기지 않아요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const previous = deferred();
    const next = deferred();
    vi.mocked(refreshJourney)
      .mockReturnValueOnce(previous.promise)
      .mockReturnValueOnce(next.promise);

    await getState().add({ type: 'exclude', photoId: 'p_c' });
    getState().reset();
    expect(getState().journeyStatus).toBe('idle');

    useAuthStore.setState({ user: { id: 'u2' } });
    vi.mocked(getCorrections).mockResolvedValue([]);
    await getState().fetch();
    await getState().add({ type: 'exclude', photoId: 'p_x' });
    expect(refreshJourney).toHaveBeenLastCalledWith('u2');

    previous.resolve();
    await flushTasks();
    expect(getState().journeyStatus).toBe('building');

    next.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
  });

  test('로그인하지 않았으면 다시 시도해도 계산하지 않아요', async () => {
    useAuthStore.setState({ user: null });

    await getState().refreshJourney();

    expect(refreshJourney).not.toHaveBeenCalled();
    expect(getState().journeyStatus).toBe('idle');
  });
});

describe('다음에 들어올 때 이어서 계산', () => {
  const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: '연결 실패' };
  const getMark = (ownerId) => localStorage.getItem(`danyeo-on:journey-stale:${ownerId}`);

  test('보정을 보내기 전에 표시를 남기고, 계산이 저장되면 지워요', async () => {
    await fetchSaved();
    const sending = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(sending.promise));
    vi.mocked(refreshJourney).mockResolvedValue();

    const added = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '새 이름' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    expect(getMark('u1')).not.toBeNull();

    sending.resolve();
    await added;
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
    expect(getMark('u1')).toBeNull();
  });

  test('서버에 보내지 않은 보정은 표시를 남기지 않아요', async () => {
    await fetchSaved();

    await getState().add({ type: 'exclude', photoId: 'p_b' });

    expect(getMark('u1')).toBeNull();
  });

  test('계산이 실패하면 표시를 남겨서, 다시 들어오면 이어서 계산해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await fetchSaved();
    vi.mocked(removeCorrection).mockResolvedValue(true);
    vi.mocked(refreshJourney).mockRejectedValueOnce(LOAD_FAILED).mockResolvedValueOnce();

    await getState().remove(exclude.id);
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('failed'));
    expect(getMark('u1')).not.toBeNull();

    getState().reset();
    await getState().resumeJourneyRefresh();

    expect(refreshJourney).toHaveBeenCalledTimes(2);
    expect(refreshJourney).toHaveBeenLastCalledWith('u1');
    expect(getState().journeyStatus).toBe('saved');
    expect(getMark('u1')).toBeNull();
  });

  test('저장하는 사이 계정이 바뀌어 계산하지 못하면, 그 계정으로 돌아왔을 때 계산해요', async () => {
    await fetchSaved();
    const sending = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(sending.promise));
    vi.mocked(refreshJourney).mockResolvedValue();

    const added = getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    useAuthStore.setState({ user: { id: 'u2' } });
    sending.resolve();
    await expect(added).rejects.toEqual(ACCOUNT_CHANGED);

    // 다른 계정에는 표시가 없어서 계산하지 않아요.
    await getState().resumeJourneyRefresh();
    expect(refreshJourney).not.toHaveBeenCalled();

    getState().reset();
    useAuthStore.setState({ user: { id: 'u1' } });
    await getState().resumeJourneyRefresh();
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');
    expect(getMark('u1')).toBeNull();
  });

  test('계산하는 사이 새 보정을 보내면, 앞 계산이 끝나도 표시를 지우지 않아요', async () => {
    await fetchSaved();
    const first = deferred();
    vi.mocked(refreshJourney).mockReturnValueOnce(first.promise).mockResolvedValueOnce();
    const sending = deferred();
    vi.mocked(addCorrection)
      .mockImplementationOnce(echoId)
      .mockImplementationOnce(echoAfter(sending.promise));

    await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '먼저' });
    const next = getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '나중' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(2));

    first.resolve();
    await flushTasks();
    expect(getMark('u1')).not.toBeNull();

    sending.resolve();
    await next;
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
    expect(getMark('u1')).toBeNull();
  });

  test('보정을 보내는 중에 시작한 계산은 그 보정을 못 읽었을 수 있어서 표시를 지우지 않아요', async () => {
    await fetchSaved();
    const sending = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(sending.promise));
    vi.mocked(refreshJourney).mockResolvedValue();

    const added = getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    await getState().refreshJourney();
    expect(getMark('u1')).not.toBeNull();

    sending.resolve();
    await added;
    await vi.waitFor(() => expect(getMark('u1')).toBeNull());
  });

  test('같은 탭에서 연달아 고치면 마지막 계산이 끝난 뒤 표시가 남지 않아요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const first = deferred();
    const second = deferred();
    vi.mocked(refreshJourney)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '먼저' });
    await getState().add({ type: 'rename', anchorPhotoId: 'p_a', name: '나중' });
    // 앞 계산도 뒤 계산의 결과를 받아요(#148). 앞 계산이 먼저 끝나도 표시는 뒤 계산이 정리해요.
    first.resolve();
    await flushTasks();
    second.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));

    expect(getMark('u1')).toBeNull();
  });

  test('계산하는 사이 다른 탭이 보정을 바꾸면 표시를 남겨서 다음에 들어올 때 다시 계산해요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const building = deferred();
    vi.mocked(refreshJourney).mockReturnValueOnce(building.promise).mockResolvedValueOnce();

    await getState().add({ type: 'exclude', photoId: 'p_c' });
    localStorage.setItem('danyeo-on:journey-stale:u1', 'other-tab');
    building.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));
    expect(getMark('u1')).not.toBeNull();

    getState().reset();
    await getState().resumeJourneyRefresh();
    expect(refreshJourney).toHaveBeenCalledTimes(2);
    expect(getMark('u1')).toBeNull();
  });

  test('다른 탭의 계산이 먼저 저장해 표시를 지웠으면, 늦게 끝난 계산은 표시를 다시 남겨요', async () => {
    await fetchSaved();
    vi.mocked(addCorrection).mockImplementation(echoId);
    const building = deferred();
    vi.mocked(refreshJourney).mockReturnValue(building.promise);

    await getState().add({ type: 'exclude', photoId: 'p_c' });
    // 다른 탭이 더 새 보정까지 읽어 먼저 저장했어요. 이 계산이 그 Journey를 덮었을 수 있어요.
    localStorage.removeItem('danyeo-on:journey-stale:u1');
    building.resolve();
    await vi.waitFor(() => expect(getState().journeyStatus).toBe('saved'));

    expect(getMark('u1')).not.toBeNull();
  });

  test('브라우저 저장소를 못 쓰면 이 탭의 표시로 이어서 계산해요', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('꽉 찼어요', 'QuotaExceededError');
    });
    await fetchSaved();
    const sending = deferred();
    vi.mocked(addCorrection).mockImplementation(echoAfter(sending.promise));
    vi.mocked(refreshJourney).mockResolvedValue();

    const added = getState().add({ type: 'exclude', photoId: 'p_c' });
    await vi.waitFor(() => expect(addCorrection).toHaveBeenCalledTimes(1));
    getState().reset();
    useAuthStore.setState({ user: { id: 'u2' } });
    sending.resolve();
    await expect(added).rejects.toEqual(ACCOUNT_CHANGED);
    expect(refreshJourney).not.toHaveBeenCalled();

    getState().reset();
    useAuthStore.setState({ user: { id: 'u1' } });
    await getState().resumeJourneyRefresh();
    expect(refreshJourney).toHaveBeenCalledExactlyOnceWith('u1');

    // 계산이 저장되면 이 탭의 표시도 지워서 다시 계산하지 않아요.
    getState().reset();
    await getState().resumeJourneyRefresh();
    expect(refreshJourney).toHaveBeenCalledTimes(1);
  });

  test('표시가 없거나 로그인하지 않았으면 이어서 계산하지 않아요', async () => {
    await getState().resumeJourneyRefresh();
    useAuthStore.setState({ user: null });
    localStorage.setItem('danyeo-on:journey-stale:undefined', '1');
    await getState().resumeJourneyRefresh();

    expect(refreshJourney).not.toHaveBeenCalled();
    expect(getState().journeyStatus).toBe('idle');
  });
});

describe('reset', () => {
  test('처음 상태로 돌아가요', async () => {
    await fetchSaved();

    getState().reset();

    expect(getState()).toMatchObject({
      corrections: [],
      status: 'idle',
      error: null,
      pending: {},
      journeyStatus: 'idle',
    });
  });

  test('같은 계정으로 다시 들어오면, 나가기 전에 보낸 요청이 끝난 뒤에 보내요', async () => {
    await fetchSaved();
    const before = deferred();
    vi.mocked(addCorrection)
      .mockImplementationOnce(echoAfter(before.promise))
      .mockImplementationOnce(echoId);

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
    vi.mocked(addCorrection)
      .mockImplementationOnce(echoAfter(stuck.promise))
      .mockImplementationOnce(echoId);

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
