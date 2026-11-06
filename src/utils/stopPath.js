import { TRIP_PARAM } from '@/constants/journey';

// 03 전체 기록에서 그 여행의 탭을 여는 주소예요.
function getTripPath(tripId) {
  return `/places?${TRIP_PARAM}=${encodeURIComponent(tripId)}`;
}

/**
 * 지점을 눌렀을 때 가는 곳이에요. 챕터 지점이면 02 챕터, 아니면 03 전체 기록의 그 여행 탭이에요(기능 명세 R106).
 * 02의 [계속 여행하기]와 01 지도의 지점 클릭이 같은 규칙이라 한 곳에서 정해요.
 *
 * @param {Pick<import('@/types').Stop, 'chapter' | 'slug' | 'transit' | 'tripId'>} stop
 * @returns {string} 예: '/chapter/밴쿠버-2025', '/places?trip=p_356b49'
 */
export function getStopPath(stop) {
  if (stop.chapter && stop.slug && !stop.transit) return `/chapter/${stop.slug}`;
  return getTripPath(stop.tripId);
}

/**
 * 챕터 맨 아래 버튼이 가는 곳과 글자를 정해요.
 * 다음 지점이 있으면 그 지점의 목적지로 [계속 여행하기]이고,
 * 여행의 마지막 지점이라 다음이 없으면 03에서 이 여행의 탭을 여는 [전체 기록 보기]예요.
 *
 * @param {Pick<import('@/types').Stop, 'tripId'>} stop 지금 보는 지점
 * @param {import('@/types').Stop | null} nextStop 같은 여행의 다음 지점. 없으면 null
 * @returns {{ path: string, label: string, nextName: string | null }}
 *   nextName은 "NEXT · {다음 지점}"에 쓸 이름이에요
 */
export function getContinueTarget(stop, nextStop) {
  if (nextStop) {
    return { path: getStopPath(nextStop), label: '계속 여행하기', nextName: nextStop.city };
  }
  return { path: getTripPath(stop.tripId), label: '전체 기록 보기', nextName: null };
}
