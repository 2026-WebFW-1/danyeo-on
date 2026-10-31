import { PERIODS } from '@/constants/journey';
import { toLocalDate } from '@/utils/localDate';

/**
 * 01 지도 재생에서 고른 기간의 구간만 돌려줘요. 순서는 journey.legs 그대로예요.
 * 기간과 하루라도 겹치는 여행은 구간을 통째로 넣어요. 그래야 지도에서 여행이 늘 집 → … → 집으로 이어져요.
 * 집을 안 들르고 다음 여행으로 가는 구간(gap)은 앞뒤 여행이 둘 다 들어갈 때만 넣어요.
 * 여행이 없거나(periods: null) 없는 기간이면 빈 배열이에요.
 *
 * 부를 때마다 새 배열이라, usePlayback에 넘길 때는 useMemo로 감싸요(배열이 바뀌면 처음부터 재생해요).
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {'1y' | '2y' | 'all'} period
 * @returns {import('@/types').Leg[]}
 */
export function selectLegsByPeriod(journey, period) {
  if (!PERIODS.includes(period)) return [];
  const range = journey?.periods?.[period];
  if (!range) return [];

  // 기간은 시간대 없는 날짜('2025-08-16')라서, 여행 시각도 현지 날짜로 바꿔 문자열로 비교해요. 양 끝을 포함해요.
  // 구간 도착 시각으로 비교하면 마지막 귀국 구간(기준일 다음 날 도착)이 ALL에서도 빠져요.
  const tripIds = new Set(
    journey.trips
      .filter((trip) => toLocalDate(trip.from) <= range.to && toLocalDate(trip.to) >= range.from)
      .map((trip) => trip.id),
  );
  const stopTripIds = new Map(journey.stops.map((stop) => [stop.id, stop.tripId]));

  return journey.legs.filter((leg) =>
    leg.tripId
      ? tripIds.has(leg.tripId)
      : tripIds.has(stopTripIds.get(leg.from)) && tripIds.has(stopTripIds.get(leg.to)),
  );
}
