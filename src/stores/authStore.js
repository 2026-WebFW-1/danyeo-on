import { create } from 'zustand';

import { SESSION_CHECK_TIMEOUT_MS } from '@/constants/auth';
import * as authService from '@/services/authService';

// init()은 앱에서 한 번만 돌아야 해요. StrictMode가 effect를 두 번 불러도 세션 구독이 겹치지 않게 막아요.
let initPromise = null;
let stopSessionWatch = null;
// 진행 중인 로그아웃 요청. supabase-js는 로그아웃 요청이 끝난 뒤에 브라우저 세션을 지우는데, 로그인은 그걸 기다리지 않아요.
// 그 사이에 다시 로그인하면 늦게 끝난 로그아웃이 새 세션을 지워서 12b로 튕기므로, 로그인이 이걸 먼저 기다려요(#85 리뷰).
let signOutPromise = null;

const INITIAL_STATE = { user: null, status: 'unknown', isSignedOutByUser: false };
const ANONYMOUS = { user: null, status: 'anonymous', isSignedOutByUser: false };

/** 세션 확인이 너무 오래 걸리면 로그인 안 한 것으로 보고 넘어가요. */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('세션 확인 시간 초과')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * 로그인 상태
 *
 * status
 *  - 'unknown': 앱을 막 열어 세션을 확인하는 중. RequireAuth가 로딩을 보여 줘요
 *  - 'anonymous': 로그인 안 함. 보호 화면은 로그인 화면으로 보내요
 *  - 'authenticated': 로그인함. user가 있어요
 *
 * isSignedOutByUser: 본인이 [로그아웃]을 눌러 나갔으면 true.
 * RequireAuth가 이걸 보고 "로그인이 필요해요"(12b) 없이 로그인 화면으로 보내요.
 * 세션 만료·다른 탭 로그아웃은 false라 12b로 가요.
 *
 * 꺼낼 땐 필요한 값만 골라요: useAuthStore((state) => state.status)
 */
export const useAuthStore = create((set) => ({
  /** @type {import('@/types').AuthUser | null} */
  user: INITIAL_STATE.user,
  /** @type {'unknown' | 'anonymous' | 'authenticated'} */
  status: INITIAL_STATE.status,
  isSignedOutByUser: INITIAL_STATE.isSignedOutByUser,

  /**
   * 앱을 열 때 한 번. 남은 세션을 되살리고, 세션이 끊기면 로그아웃 상태로 바꾸도록 걸어 둬요.
   * 세션 확인이 실패하거나 오래 걸려도 'anonymous'로 두어 화면이 로딩에 멈추지 않게 해요.
   */
  init: () => {
    if (initPromise) return initPromise;

    stopSessionWatch = authService.onSessionChange((user) =>
      set((state) => {
        // 본인이 로그아웃할 때도 세션이 끊겨 여기가 불려요. 그때는 이미 anonymous라 표시를 덮지 않게 그대로 둬요.
        if (!user) return state.status === 'anonymous' ? state : ANONYMOUS;
        // 세션은 탭끼리 같이 써서, 다른 탭에서 로그인하면 그 사람으로 맞춰요. 로그아웃 중이면 무시해요.
        // TODO(jihyo0517): 스토어 규칙 이슈에서 계정이 바뀔 때 resetStores()도 부르기(D 문서 3장 스토어 규칙 5).
        if (signOutPromise || state.user?.id === user.id) return state;
        return { user, status: 'authenticated', isSignedOutByUser: false };
      }),
    );
    initPromise = (async () => {
      try {
        const user = await withTimeout(authService.getSessionUser(), SESSION_CHECK_TIMEOUT_MS);
        set(user ? { user, status: 'authenticated', isSignedOutByUser: false } : ANONYMOUS);
      } catch {
        set(ANONYMOUS);
      }
    })();
    return initPromise;
  },

  /**
   * 로그인. 실패하면 상태를 바꾸지 않고 오류를 던져요(로그인 화면이 문구를 보여 줘요).
   * @param {string} email
   * @param {string} password
   */
  signIn: async (email, password) => {
    await signOutPromise;
    const user = await authService.signInWithPassword(email, password);
    set({ user, status: 'authenticated', isSignedOutByUser: false });
    return user;
  },

  /**
   * 본인이 로그아웃. 상태를 먼저 바꿔서, 서버 요청이 실패해도 화면은 로그아웃 상태로 둬요.
   * 로그인 화면으로 보내는 건 RequireAuth가 해요. 부르는 쪽이 따로 이동하지 않아요.
   */
  signOut: async () => {
    set({ user: null, status: 'anonymous', isSignedOutByUser: true });
    const request = authService
      .signOut()
      .catch(() => {
        // 브라우저의 세션은 이미 지워졌어요. 서버가 못 받아도 다시 로그인하면 새 세션이라 그냥 둬요.
      })
      .finally(() => {
        if (signOutPromise === request) signOutPromise = null;
      });
    signOutPromise = request;
    await request;
  },

  /**
   * 처음(init 전) 상태로 되돌려요. 세션 구독도 떼어서 init()을 다시 부를 수 있어요.
   * 스토어마다 reset()을 두는 규칙을 따른 것이고, 지금은 테스트가 써요.
   * 로그아웃은 signOut()이에요. 이건 세션을 지우지 않아요.
   */
  reset: () => {
    stopSessionWatch?.();
    stopSessionWatch = null;
    initPromise = null;
    signOutPromise = null;
    set(INITIAL_STATE);
  },
}));
