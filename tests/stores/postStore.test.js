import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getPosts, savePost } from '@/services/postService';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';

vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

const { getState } = usePostStore;
const DATE = '2025-07-12';
const saved = {
  id: 'post_seojin_5',
  ownerId: 'u1',
  date: DATE,
  title: '카필라노 흔들다리',
  body: '이전 본문',
  tags: ['밴쿠버'],
  photoIds: ['p_a'],
  updatedAt: '2025-07-12T10:00:00Z',
};
const otherDay = { ...saved, id: 'post_seojin_6', date: '2025-07-20' };
const input = { date: DATE, title: '새 제목', body: '새 본문', tags: ['다리'], photoIds: ['p_b'] };

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
  vi.mocked(getPosts).mockResolvedValue([saved, otherDay]);
  await getState().fetch();
}

beforeEach(() => {
  getState().reset();
  useAuthStore.setState({ user: { id: 'u1' } });
});

afterEach(() => {
  useAuthStore.getState().reset();
  vi.resetAllMocks();
});

describe('fetch', () => {
  test('글을 날짜로 묶고 ready가 돼요', async () => {
    // when
    await fetchSaved();

    // then
    expect(getState().byDate[DATE].title).toBe('카필라노 흔들다리');
    expect(getState().byDate[otherDay.date]).toBe(otherDay);
    expect(getState().status).toBe('ready');
  });

  test('실패하면 던지지 않고 status가 error이고 오류가 남아요', async () => {
    // given
    const error = { message: '실패' };
    vi.mocked(getPosts).mockRejectedValue(error);

    // when
    await getState().fetch();

    // then
    expect(getState().status).toBe('error');
    expect(getState().error).toBe(error);
  });

  test('이미 loading이면 다시 부르지 않아요', async () => {
    // given
    const request = deferred();
    vi.mocked(getPosts).mockReturnValue(request.promise);

    // when
    const first = getState().fetch();
    await getState().fetch();
    request.resolve([]);
    await first;

    // then
    expect(getPosts).toHaveBeenCalledTimes(1);
  });
});

describe('save', () => {
  test('새 날짜는 새 id로 저장하고 그 글을 돌려줘요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();

    // when
    const post = await getState().save(input);

    // then
    expect(vi.mocked(savePost).mock.calls[0][0].id).toMatch(/^post_[0-9a-f]{12}$/);
    expect(getState().byDate[DATE]).toBe(post);
    expect(post).toMatchObject({ ...input, ownerId: 'u1' });
  });

  test('있는 날짜는 같은 id로 저장하고 네 칸을 모두 보내요', async () => {
    // given
    await fetchSaved();
    vi.mocked(savePost).mockResolvedValue();

    // when
    await getState().save(input);

    // then
    expect(savePost).toHaveBeenCalledWith({ id: 'post_seojin_5', ...input });
    expect(getState().byDate[DATE]).toMatchObject({ id: 'post_seojin_5', body: '새 본문' });
    expect(getState().byDate[otherDay.date]).toBe(otherDay);
  });

  test('한 날짜의 저장이 끝나도 다른 날짜의 상태는 그대로예요', async () => {
    // given: 두 날짜를 저장하는 중이고, 다른 날짜에는 앞선 실패가 남아 있어요
    const error = { message: '앞선 실패' };
    usePostStore.setState({ saveError: { '2025-07-21': error } });
    const finishes = deferred();
    const fails = deferred();
    vi.mocked(savePost).mockReturnValueOnce(finishes.promise).mockReturnValueOnce(fails.promise);
    const first = getState().save(input);
    const second = getState().save({ ...input, date: otherDay.date });

    // when: 먼저 하나가 성공해요
    finishes.resolve();
    await first;

    // then
    expect(getState().saving).toEqual({ [otherDay.date]: true });

    // when: 남은 하나가 실패해요
    fails.reject({ message: '실패' });
    await second.catch(() => {});

    // then
    expect(getState().saving).toEqual({});
    expect(getState().saveError).toEqual({
      '2025-07-21': error,
      [otherDay.date]: { message: '실패' },
    });
    expect(getState().byDate[DATE].title).toBe('새 제목');
  });

  test('저장 중에는 saving이 true이고 앞선 saveError를 지워요', async () => {
    // given
    vi.mocked(savePost).mockRejectedValueOnce({ message: '앞선 실패' });
    await getState()
      .save(input)
      .catch(() => {});
    const request = deferred();
    vi.mocked(savePost).mockReturnValue(request.promise);

    // when
    const saving = getState().save(input);

    // then
    expect(getState().saving[DATE]).toBe(true);
    expect(getState().saveError[DATE]).toBeUndefined();

    request.resolve();
    await saving;
    expect(getState().saving[DATE]).toBeUndefined();
  });

  test('실패하면 던지고 글은 그대로 두고 saveError를 남겨요', async () => {
    // given
    await fetchSaved();
    const error = { message: '저장 실패' };
    vi.mocked(savePost).mockRejectedValue(error);

    // when, then
    await expect(getState().save(input)).rejects.toBe(error);
    expect(getState().byDate[DATE]).toBe(saved);
    expect(getState().saving[DATE]).toBeUndefined();
    expect(getState().saveError[DATE]).toBe(error);
  });

  test('같은 날짜를 저장 중이면 서버를 부르지 않고 던지고, 앞선 저장은 그대로 끝나요', async () => {
    // given
    const request = deferred();
    vi.mocked(savePost).mockReturnValue(request.promise);
    const first = getState().save(input);

    // when, then
    await expect(getState().save(input)).rejects.toThrow();
    expect(savePost).toHaveBeenCalledTimes(1);
    expect(getState().saving[DATE]).toBe(true);
    expect(getState().saveError[DATE]).toBeUndefined();

    request.resolve();
    const post = await first;
    expect(getState().byDate[DATE]).toBe(post);
    expect(getState().saving[DATE]).toBeUndefined();
  });

  test('날짜가 YYYY-MM-DD가 아니면 서버를 부르지 않고 던져요', async () => {
    await expect(getState().save({ ...input, date: '2025-7-1' })).rejects.toThrow();
    expect(savePost).not.toHaveBeenCalled();
  });
});

describe('reset', () => {
  test('처음 상태로 돌아가요', async () => {
    // given
    await fetchSaved();

    // when
    getState().reset();

    // then
    const { byDate, status, error, saving, saveError } = getState();
    expect({ byDate, status, error, saving, saveError }).toEqual({
      byDate: {},
      status: 'idle',
      error: null,
      saving: {},
      saveError: {},
    });
  });

  test('reset 뒤 늦게 끝난 불러오기가 상태를 바꾸지 않아요', async () => {
    // given
    const request = deferred();
    vi.mocked(getPosts).mockReturnValue(request.promise);
    const fetching = getState().fetch();

    // when
    getState().reset();
    request.resolve([saved]);
    await fetching;

    // then
    expect(getState().byDate).toEqual({});
    expect(getState().status).toBe('idle');
  });

  test('reset 뒤 늦게 끝난 저장이 상태를 바꾸지 않아요', async () => {
    // given: 하나는 성공, 하나는 실패로 끝나요
    const succeeds = deferred();
    const fails = deferred();
    vi.mocked(savePost).mockReturnValueOnce(succeeds.promise).mockReturnValueOnce(fails.promise);
    const first = getState().save(input);
    const second = getState().save({ ...input, date: '2025-07-13' });

    // when
    getState().reset();
    succeeds.resolve();
    fails.reject({ message: '늦은 실패' });
    await first;
    await second.catch(() => {});

    // then
    const { byDate, saving, saveError } = getState();
    expect({ byDate, saving, saveError }).toEqual({ byDate: {}, saving: {}, saveError: {} });
  });
});
