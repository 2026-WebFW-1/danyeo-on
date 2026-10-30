import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SESSION_CHECK_TIMEOUT_MS } from '@/constants/auth';
import * as authService from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

// 진짜 Supabase를 부르지 않게 authService를 가짜로 바꿔요. 모양은 진짜와 같아요.
vi.mock('@/services/authService', () => ({
  getSessionUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onSessionChange: vi.fn(),
}));

const SEOJIN = {
  id: 'd0000000-0000-4000-8000-000000000001',
  email: 'seojin@demo.local',
  name: '윤서진',
};
const EDGE = { id: 'd0000000-0000-4000-8000-000000000002', email: 'edge@demo.local', name: 'edge' };

let changeSession;
const endSession = () => changeSession(null);
let stopWatching;

// 스토어는 모듈 하나를 같이 써서, 테스트마다 reset()으로 처음 상태와 init 표시를 되돌려요.
beforeEach(() => {
  useAuthStore.getState().reset();
  stopWatching = vi.fn();
  vi.mocked(authService.onSessionChange).mockImplementation((callback) => {
    changeSession = callback;
    return stopWatching;
  });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});

describe('처음 상태', () => {
  test('세션을 확인하기 전이라 unknown이고 user가 없어요', () => {
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'unknown' });
  });
});

describe('init', () => {
  test('남은 세션이 있으면 authenticated와 그 사람이에요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);

    await useAuthStore.getState().init();

    expect(useAuthStore.getState()).toMatchObject({ user: SEOJIN, status: 'authenticated' });
  });

  test('세션이 없으면 anonymous예요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(null);

    await useAuthStore.getState().init();

    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'anonymous' });
  });

  test('세션 확인이 실패해도 던지지 않고 anonymous예요', async () => {
    vi.mocked(authService.getSessionUser).mockRejectedValue(new Error('Failed to fetch'));

    await expect(useAuthStore.getState().init()).resolves.toBeUndefined();
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  test('세션 확인이 끝나지 않으면 정한 시간 뒤 anonymous예요', async () => {
    vi.useFakeTimers();
    vi.mocked(authService.getSessionUser).mockReturnValue(new Promise(() => {}));

    const done = useAuthStore.getState().init();
    expect(useAuthStore.getState().status).toBe('unknown');

    await vi.advanceTimersByTimeAsync(SESSION_CHECK_TIMEOUT_MS);
    await done;
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  test('두 번 불러도 세션 확인과 구독은 한 번이에요 (StrictMode)', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);

    const first = useAuthStore.getState().init();
    const second = useAuthStore.getState().init();
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(authService.getSessionUser).toHaveBeenCalledTimes(1);
    expect(authService.onSessionChange).toHaveBeenCalledTimes(1);
  });
});

describe('signIn', () => {
  test('성공하면 authenticated와 그 사람이고, 그 사람을 돌려줘요', async () => {
    vi.mocked(authService.signInWithPassword).mockResolvedValue(SEOJIN);

    const user = await useAuthStore.getState().signIn('seojin@demo.local', 'demo1234');

    expect(authService.signInWithPassword).toHaveBeenCalledWith('seojin@demo.local', 'demo1234');
    expect(user).toEqual(SEOJIN);
    expect(useAuthStore.getState()).toMatchObject({ user: SEOJIN, status: 'authenticated' });
  });

  test('실패하면 오류를 던지고 상태는 그대로예요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(null);
    await useAuthStore.getState().init();
    const error = Object.assign(new Error('Invalid login credentials'), {
      code: 'invalid_credentials',
      status: 400,
    });
    vi.mocked(authService.signInWithPassword).mockRejectedValue(error);

    await expect(useAuthStore.getState().signIn('seojin@demo.local', 'wrong-pass')).rejects.toBe(
      error,
    );
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'anonymous' });
  });
});

describe('signOut', () => {
  beforeEach(async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);
    await useAuthStore.getState().init();
  });

  test('anonymous가 되고 user가 없어지고, 본인이 나갔다고 표시해요', async () => {
    vi.mocked(authService.signOut).mockResolvedValue();

    await useAuthStore.getState().signOut();

    expect(authService.signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: 'anonymous',
      isSignedOutByUser: true,
    });
  });

  test('로그아웃 때 따라오는 세션 끊김 알림이 표시를 지우지 않아요', async () => {
    vi.mocked(authService.signOut).mockResolvedValue();

    await useAuthStore.getState().signOut();
    endSession();

    expect(useAuthStore.getState().isSignedOutByUser).toBe(true);
  });

  test('다시 로그인하면 표시가 지워져요', async () => {
    vi.mocked(authService.signOut).mockResolvedValue();
    vi.mocked(authService.signInWithPassword).mockResolvedValue(SEOJIN);

    await useAuthStore.getState().signOut();
    await useAuthStore.getState().signIn('seojin@demo.local', 'demo1234');

    expect(useAuthStore.getState().isSignedOutByUser).toBe(false);
  });

  test('서버 요청을 기다리기 전에 바로 anonymous예요', () => {
    vi.mocked(authService.signOut).mockReturnValue(new Promise(() => {}));

    useAuthStore.getState().signOut();

    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  test('로그아웃 요청이 끝나기 전에 다시 로그인하면, 로그아웃이 끝난 뒤에 로그인해요', async () => {
    // 늦게 끝난 로그아웃이 방금 만든 새 세션을 지우지 않게 해요(#85 리뷰).
    let finishSignOut;
    vi.mocked(authService.signOut).mockReturnValue(
      new Promise((resolve) => {
        finishSignOut = resolve;
      }),
    );
    vi.mocked(authService.signInWithPassword).mockResolvedValue(SEOJIN);

    useAuthStore.getState().signOut();
    const signingIn = useAuthStore.getState().signIn('seojin@demo.local', 'demo1234');
    await Promise.resolve();
    expect(authService.signInWithPassword).not.toHaveBeenCalled();

    finishSignOut();
    await signingIn;
    expect(authService.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ user: SEOJIN, status: 'authenticated' });
  });

  test('로그아웃 요청이 실패해도 그다음 로그인은 돼요', async () => {
    vi.mocked(authService.signOut).mockRejectedValue(new Error('Failed to fetch'));
    vi.mocked(authService.signInWithPassword).mockResolvedValue(SEOJIN);

    useAuthStore.getState().signOut();
    await useAuthStore.getState().signIn('seojin@demo.local', 'demo1234');

    expect(useAuthStore.getState()).toMatchObject({ user: SEOJIN, status: 'authenticated' });
  });

  test('서버 요청이 실패해도 던지지 않고 anonymous예요', async () => {
    vi.mocked(authService.signOut).mockRejectedValue(new Error('Failed to fetch'));

    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'anonymous' });
  });
});

describe('reset', () => {
  test('처음 상태로 돌아가고, 세션 구독을 떼고, init()을 다시 부를 수 있어요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);
    await useAuthStore.getState().init();

    useAuthStore.getState().reset();

    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'unknown' });
    expect(stopWatching).toHaveBeenCalledTimes(1);

    await useAuthStore.getState().init();
    expect(authService.getSessionUser).toHaveBeenCalledTimes(2);
  });
});

describe('세션 만료', () => {
  test('로그인한 채 세션이 끊기면 anonymous이고, 본인이 나간 게 아니라고 표시해요(12b로 가요)', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);
    await useAuthStore.getState().init();
    expect(useAuthStore.getState().status).toBe('authenticated');

    endSession();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: 'anonymous',
      isSignedOutByUser: false,
    });
  });
});

describe('다른 탭에서 계정이 바뀜', () => {
  test('로그인한 채 다른 계정 세션이 오면 그 사람으로 바뀌어요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);
    await useAuthStore.getState().init();

    changeSession(EDGE);

    expect(useAuthStore.getState()).toMatchObject({ user: EDGE, status: 'authenticated' });
  });

  test('같은 사람의 세션(토큰 갱신 등)이면 user 객체를 바꾸지 않아요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(SEOJIN);
    await useAuthStore.getState().init();
    const before = useAuthStore.getState().user;

    changeSession({ ...SEOJIN });

    expect(useAuthStore.getState().user).toBe(before);
  });

  test('로그인 전(로그인 화면)이어도 다른 탭이 로그인하면 따라가요', async () => {
    vi.mocked(authService.getSessionUser).mockResolvedValue(null);
    await useAuthStore.getState().init();

    changeSession(EDGE);

    expect(useAuthStore.getState()).toMatchObject({ user: EDGE, status: 'authenticated' });
  });
});
