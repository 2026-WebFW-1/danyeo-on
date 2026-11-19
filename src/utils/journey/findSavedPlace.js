import { SAME_NAME_KM, UNKNOWN_CITY } from '@/constants/geocode';
import { calcDistanceKm } from '@/utils/distance';

/**
 * 저장된 Journey에서 좌표 근처(1km 안)의 지점이나 집 이름을 찾아요. 없으면 null이에요.
 * 다시 계산할 때 찾아 둔 이름을 다시 써서, 이름 찾기가 실패해도 이름이 덮이지 않게 해요(#158).
 * 이름 없는 곳은 지난 계산이 실패해서 생겼을 수 있어서 null로 두고 새로 찾게 해요.
 * 저장된 집은 집을 찾을 때만 봐요. 집에는 나라 이름이 저장돼 있지 않아서, 집이 바뀌어 이전 집 자리가
 * 여행 지점이 되면 그 지점의 나라가 비어 버려요.
 * #179 전에 저장된 집은 나라 코드(cc)가 없어서 빈 글자로 돌려줘요. 채우는 건 refreshJourney가 해요.
 *
 * @param {import('@/types').Journey | null} savedJourney journeys에 저장된 Journey. 못 읽었으면 null
 * @param {number} lat
 * @param {number} lng
 * @param {{ isHome?: boolean }} [options] isHome: 집 좌표의 이름을 찾는지
 * @returns {import('@/types').Place | null}
 */
export function findSavedPlace(savedJourney, lat, lng, { isHome = false } = {}) {
  if (!savedJourney) return null;

  const spots = isHome ? [...savedJourney.stops, savedJourney.home] : savedJourney.stops;
  const nearby = spots
    .filter(Boolean)
    .find(
      (spot) => spot.city !== UNKNOWN_CITY && calcDistanceKm(spot, { lat, lng }) <= SAME_NAME_KM,
    );
  if (!nearby) return null;

  // 집은 도시 이름과 나라 코드만 저장돼 있어요. buildJourney도 집은 이 둘만 써요(buildHome).
  return { city: nearby.city, country: nearby.country ?? '', cc: nearby.cc ?? '' };
}
