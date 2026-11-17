import { CACHE_RADIUS_KM, UNKNOWN_CITY } from '@/constants/geocode';
import { calcDistanceKm } from '@/utils/distance';

/**
 * 저장된 Journey에서 좌표 근처(1km 안)의 지점이나 집 이름을 찾아요. 없으면 null이에요.
 * 다시 계산할 때 찾아 둔 이름을 다시 써서, 이름 찾기가 실패해도 이름이 덮이지 않게 해요(#158).
 * 이름 없는 곳은 지난 계산이 실패해서 생겼을 수 있어서 null로 두고 새로 찾게 해요.
 *
 * @param {import('@/types').Journey | null} savedJourney journeys에 저장된 Journey. 못 읽었으면 null
 * @param {number} lat
 * @param {number} lng
 * @returns {import('@/types').Place | null}
 */
export function findSavedPlace(savedJourney, lat, lng) {
  if (!savedJourney) return null;

  // reverseCity가 같은 곳으로 보는 거리(CACHE_RADIUS_KM)와 맞춰요.
  const nearby = [...savedJourney.stops, savedJourney.home]
    .filter(Boolean)
    .find(
      (spot) => spot.city !== UNKNOWN_CITY && calcDistanceKm(spot, { lat, lng }) <= CACHE_RADIUS_KM,
    );
  if (!nearby) return null;

  // 집은 도시 이름만 저장돼 있어요. buildJourney도 집은 도시 이름만 써요(buildHome).
  return { city: nearby.city, country: nearby.country ?? '', cc: nearby.cc ?? '' };
}
