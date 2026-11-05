/**
 * 01 지도 재생에서 한 여행의 구간만 돌려줘요. 순서는 journey.legs 그대로예요.
 * 앞 여행에서 집을 안 들르고 바로 온 구간(gap)은 도착한 여행의 구간으로 넣어요.
 * 03의 이동 라벨·거리(selectTripStops, selectTripStats)와 같은 기준이고, 빼면 그 여행의 첫 지점에 도착하는 장면이 사라져요.
 * 없는 여행이면 빈 배열이에요.
 *
 * 부를 때마다 새 배열이라, usePlayback에 넘길 때는 useMemo로 감싸요(배열이 바뀌면 처음부터 재생해요).
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {import('@/types').Leg[]}
 */
export function selectLegsByTrip(journey, tripId) {
  const trip = journey?.trips.find((item) => item.id === tripId);
  if (!trip) return [];

  return journey.legs.filter((leg) =>
    leg.tripId ? leg.tripId === tripId : trip.stopIds.includes(leg.to),
  );
}
