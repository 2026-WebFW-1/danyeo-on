/**
 * 주소의 ?trip= 값으로 지금 볼 여행과 앞뒤 여행을 골라요(03 전체 기록).
 * 값이 없거나 없는 id면 첫 여행을 보여 줘요. 여행이 하나도 없으면 셋 다 null이에요.
 *
 * @param {import('@/types').TripListItem[]} trips selectTrips의 결과(시간 순서)
 * @param {string | null | undefined} tripId 주소에서 읽은 값
 * @returns {{
 *   current: import('@/types').TripListItem | null,
 *   prev: import('@/types').TripListItem | null,
 *   next: import('@/types').TripListItem | null,
 * }}
 */
export function selectTripPage(trips, tripId) {
  if (trips.length === 0) return { current: null, prev: null, next: null };

  const foundIndex = trips.findIndex((trip) => trip.id === tripId);
  const index = foundIndex === -1 ? 0 : foundIndex;

  return {
    current: trips[index],
    prev: trips[index - 1] ?? null,
    next: trips[index + 1] ?? null,
  };
}
