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

/**
 * 새로 저장한 사진이 들어간 여행 중 가장 이른 여행의 id를 골라요([여행 보기] → 03, U106).
 * 기존 여행에 사진이 더해졌어도 그 여행을 찾아요.
 * 새 사진이 없거나, 전부 위치가 없어 지점에 못 들어갔으면 null이에요.
 *
 * @param {import('@/types').Journey} journey refreshJourney가 저장한 Journey
 * @param {string[]} photoIds 이번에 새로 저장한 사진 id
 * @returns {string | null}
 */
export function findFirstTripOfPhotos(journey, photoIds) {
  const targetPhotoIds = new Set(photoIds);
  const matchedStopIds = new Set(
    journey.stops
      .filter((stop) => stop.photoIds.some((id) => targetPhotoIds.has(id)))
      .map((stop) => stop.id),
  );
  // journey.trips는 시간 순서라서, 처음 걸리는 여행이 가장 이른 여행이에요.
  const firstTrip = journey.trips.find((trip) => trip.stopIds.some((id) => matchedStopIds.has(id)));
  return firstTrip?.id ?? null;
}
