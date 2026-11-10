import { getSupabase } from './getSupabase';

// 행이 없는 계정이 받는 Journey예요. 빈 계정(empty)과 같은 모양이에요.
const EMPTY_JOURNEY = Object.freeze({
  home: null,
  stops: [],
  legs: [],
  trips: [],
  unlocated: [],
  excluded: [],
  periods: null,
});

// 계정마다 한 번만 읽어요. 모든 화면이 같은 객체를 받고, 다른 화면으로 가도 다시 읽지 않아요.
const cache = new Map();

/**
 * 로그인한 사람의 Journey를 Supabase journeys 테이블에서 읽어요(owner_id 행의 payload).
 * 같은 계정은 처음 한 번만 읽고 모두 같은 객체를 받아요.
 * 행이 없으면 오류가 아니라 빈 Journey예요(home·periods는 null, 배열은 비어요).
 * 실패하면 { status: 0, code: 'LOAD_FAILED', message }로 거절하고 기억을 지워서 다음에 다시 읽어요.
 * 주소·키(.env.local)가 없거나 연결에 실패해도 같아요.
 *
 * @param {string} userId 로그인한 사람의 id(AuthUser.id). 기억을 계정별로 나누는 열쇠예요
 * @returns {Promise<import('@/types').Journey>}
 */
export function getJourney(userId) {
  if (!cache.has(userId)) {
    const request = getSupabase()
      .then((supabase) =>
        supabase.from('journeys').select('payload').eq('owner_id', userId).maybeSingle(),
      )
      .then(({ data, error }) => {
        if (error) throw error;
        return data?.payload ?? EMPTY_JOURNEY;
      })
      .catch((error) => {
        throw { status: 0, code: 'LOAD_FAILED', message: error.message };
      });
    // 실패한 요청은 기억하지 않아요. 같은 요청이 그 사이에 지워졌다면 새로 쓴 기억을 지우지 않게 확인해요.
    request.catch(() => {
      if (cache.get(userId) === request) cache.delete(userId);
    });
    cache.set(userId, request);
  }
  return cache.get(userId);
}
