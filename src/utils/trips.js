import { getCityKey } from '@/utils/cityKey';
import { formatNo } from '@/utils/formatNo';
import { toLocalDate } from '@/utils/localDate';

/**
 * 여행 목록을 시간 순서대로 돌려줘요. 여행이 없거나 journey가 없으면 빈 배열이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {import('@/types').TripListItem[]}
 */
export function selectTrips(journey) {
  if (!journey) return [];

  return journey.trips.map((trip, index) => ({
    id: trip.id,
    no: formatNo(index + 1),
    name: trip.name,
    from: toLocalDate(trip.from),
    to: toLocalDate(trip.to),
    days: trip.days,
    chapter: trip.chapter,
  }));
}

/**
 * 한 여행의 일수·도시·거리·사진 수를 계산해요. 그 ID의 여행이 없으면 null이에요.
 * 경유 지점은 도시와 사진 수에서 빼고, 거리는 그 여행의 모든 이동 구간을 더해요.
 * 집을 안 들르고 앞 여행에서 바로 온 구간(gap)은 도착한 여행의 거리에 넣어요.
 * 거리(km)는 여행마다 반올림해서, 구간 km가 소수면 여행별 km의 합이 전체 합계(selectJourneyTotals)와
 * 1km나 2km 어긋날 수 있어요. 지금 fixture의 km는 정수라서 정확히 같아요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {import('@/types').TripStats | null}
 */
export function selectTripStats(journey, tripId) {
  const trip = journey?.trips.find((t) => t.id === tripId);
  if (!trip) return null;

  const stopsById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const legsById = new Map(journey.legs.map((leg) => [leg.id, leg]));

  const stops = trip.stopIds.map((id) => stopsById.get(id)).filter((stop) => stop && !stop.transit);

  // gap 구간은 tripId가 없어서 trip.legIds에 안 들어 있어요. 도착 지점이 이 여행에 있으면 이 여행의 이동으로 세요.
  // 그래야 여행별 km를 모두 더했을 때 전체 km와 같고, 두 여행을 합쳐도 이동 거리가 그대로예요.
  const gapLegIds = journey.legs
    .filter((leg) => !leg.tripId && trip.stopIds.includes(leg.to))
    .map((leg) => leg.id);
  const legIds = new Set([...trip.legIds, ...gapLegIds]);
  const km = [...legIds].reduce((sum, id) => sum + (legsById.get(id)?.km ?? 0), 0);

  // 도시 이름만 보면 다른 나라의 같은 이름을 하나로 세므로 나라 코드를 같이 묶어요(selectJourneyTotals와 같은 기준).
  const cities = new Set(stops.map(getCityKey));

  return {
    days: trip.days,
    cities: cities.size,
    km: Math.round(km),
    photos: stops.reduce((sum, stop) => sum + stop.photoCount, 0),
  };
}
