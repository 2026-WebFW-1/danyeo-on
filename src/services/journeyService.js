import { buildJourney } from '@/utils/journey/buildJourney';

import { getSupabase } from './getSupabase';
import { clearMyPhotos } from './myPhotosService';
import { getMyData } from './photoService';
import { reverseCity } from './reverseCity';

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
 * 읽는 사이에 세션 계정이 바뀌었으면 결과를 버리고 code: 'ACCOUNT_CHANGED'로 거절해요(기억하지 않아요).
 *
 * @param {string} userId 로그인한 사람의 id(AuthUser.id). 기억을 계정별로 나누는 열쇠예요
 * @returns {Promise<import('@/types').Journey>}
 */
export function getJourney(userId) {
  if (!cache.has(userId)) {
    const request = getSupabase()
      .then(async (supabase) => {
        const { data, error } = await supabase
          .from('journeys')
          .select('payload')
          .eq('owner_id', userId)
          .maybeSingle();
        if (error) throw error;
        // 읽는 사이 로그아웃·계정 전환이 있으면 요청이 다른 세션으로 나가 RLS 때문에 행이 안 보여요.
        // 그 빈 결과를 이 계정의 Journey로 기억하지 않게, 지금 세션이 요청한 계정인지 확인해요.
        const { data: auth } = await supabase.auth.getSession();
        if (auth.session?.user.id !== userId) {
          throw { status: 0, code: 'ACCOUNT_CHANGED', message: '읽는 사이에 계정이 바뀌었어요' };
        }
        return data?.payload ?? EMPTY_JOURNEY;
      })
      .catch((error) => {
        if (error.code === 'ACCOUNT_CHANGED') throw error;
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

/**
 * 계산한 Journey를 journeys 테이블의 내 행(owner_id)에 덮어써요. 행이 없으면 새로 만들어요.
 * 쓴 뒤에는 그 계정의 기억을 지워서, 다음 getJourney가 새로 쓴 Journey를 읽어요.
 * RLS에 막히면 새 행은 오류가 나지만 있던 행은 오류 없이 0행으로 끝나서, .select()로 돌려받은 행도 봐요.
 * 쓰는 사이 계정이 바뀌어도 owner_id가 지금 세션과 달라 0행으로 끝나요.
 * 실패하면 { status: 0, code: 'SAVE_FAILED', message }로 거절하고, 기억은 그대로 둬요.
 *
 * @param {string} userId 로그인한 사람의 id(AuthUser.id)
 * @param {import('@/types').Journey} journey buildJourney가 돌려준 값
 * @returns {Promise<void>}
 */
export async function saveJourney(userId, journey) {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('journeys')
      .upsert(
        { owner_id: userId, payload: journey, updated_at: new Date().toISOString() },
        { onConflict: 'owner_id' },
      )
      .select('owner_id');
    if (error) throw error;
    if (!data?.length) throw new Error('journeys에 쓰지 못했어요(0행)');
  } catch (error) {
    throw { status: 0, code: 'SAVE_FAILED', message: error.message };
  }
  cache.delete(userId);
}

/**
 * 내 사진·보정을 서버에서 읽어 Journey를 다시 계산하고 journeys에 써요.
 * 사진을 저장한 뒤(#144)나 보정을 저장한 뒤 불러요. 쓴 뒤에는 Journey와 사진 목록의 기억을 지워서
 * 03·02가 다음에 새 값을 읽어요.
 * 도시 이름 찾기(reverseCity)가 1.1초 간격이라 지점 수만큼 시간이 걸려요.
 * 도시 이름을 못 찾은 지점은 던지지 않고 이름 없이 계산돼요.
 *
 * 실패하면 { status: 0, code, message }로 거절해요. 사진·보정은 그대로라 같은 함수로 다시 시도하면 돼요.
 *  - LOAD_FAILED: 사진·보정을 읽지 못했어요
 *  - ACCOUNT_CHANGED: 읽는 사이 계정이 바뀌었어요(계산·저장하지 않아요)
 *  - BUILD_FAILED: 계산하다 오류가 났어요
 *  - SAVE_FAILED: journeys에 쓰지 못했어요(saveJourney)
 *
 * @param {string} userId 로그인한 사람의 id(AuthUser.id)
 * @returns {Promise<import('@/types').Journey>} 저장한 Journey
 */
export async function refreshJourney(userId) {
  let myData;
  try {
    myData = await getMyData();
  } catch (error) {
    throw { status: 0, code: 'LOAD_FAILED', message: error.message };
  }
  // 다른 계정의 사진으로 도시 이름을 찾느라 시간을 버리지 않게, 계산 전에 걸러요.
  // 확인한 뒤 계정이 바뀌면 saveJourney가 RLS에 막혀 실패해요.
  if (myData.user?.id !== userId) {
    throw { status: 0, code: 'ACCOUNT_CHANGED', message: '읽는 사이에 계정이 바뀌었어요' };
  }

  let journey;
  try {
    journey = await buildJourney(myData.photos, myData.corrections, reverseCity);
  } catch (error) {
    throw { status: 0, code: 'BUILD_FAILED', message: error.message };
  }

  await saveJourney(userId, journey);
  // 03·02의 썸네일도 새 사진을 읽게 비워요.
  clearMyPhotos();
  return journey;
}
