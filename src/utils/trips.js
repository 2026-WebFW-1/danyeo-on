/**
 * 한 여행을 목록(03 전체 기록의 탭 줄 등)에 보여 줄 때 필요한 값이에요.
 *
 * @typedef {object} TripListItem
 * @property {string} id 여행 ID
 * @property {string} no 목록 번호. 예: '01', '14'
 * @property {string} name 여행 이름. 예: '방콕 · 다낭'
 * @property {string} from 시작 날짜. 예: '2024-07-11'
 * @property {string} to 끝 날짜. 예: '2024-07-16'
 * @property {number} days
 * @property {boolean} chapter 챕터 지점이 있는 여행이면 true
 */

/**
 * 한 여행의 요약 숫자(StatRow에 들어가는 값)예요.
 *
 * @typedef {object} TripStats
 * @property {number} days 여행 일수
 * @property {number} cities 도시 수. 경유 지점은 안 세고, 이름이 같아도 나라가 다르면 따로 세요
 * @property {number} km 이동 거리 합. 집을 안 들르고 앞 여행에서 바로 온 구간(gap)도 넣고, 반올림한 정수예요
 * @property {number} photos 사진 수. 경유 지점의 사진은 빼요
 */

// from/to는 '2024-07-11T09:00:00+09:00'처럼 현지 시간대가 붙은 문자열이에요.
// Date로 바꾸면 브라우저 시간대로 날짜가 밀릴 수 있어서, 앞 10글자(현지 날짜)를 그대로 잘라 써요.
const DATE_LENGTH = 'YYYY-MM-DD'.length;

/**
 * 여행 목록을 시간 순서대로 돌려줘요. 여행이 없거나 journey가 없으면 빈 배열이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {TripListItem[]}
 */
export function selectTrips(journey) {
  if (!journey) return [];

  return journey.trips.map((trip, index) => ({
    id: trip.id,
    no: String(index + 1).padStart(2, '0'),
    name: trip.name,
    from: trip.from.slice(0, DATE_LENGTH),
    to: trip.to.slice(0, DATE_LENGTH),
    days: trip.days,
    chapter: trip.chapter,
  }));
}

/**
 * 한 여행의 일수·도시·거리·사진 수를 계산해요. 그 ID의 여행이 없으면 null이에요.
 * 경유 지점은 도시와 사진 수에서 빼고, 거리는 그 여행의 모든 이동 구간을 더해요.
 * 집을 안 들르고 앞 여행에서 바로 온 구간(gap)은 도착한 여행의 거리에 넣어요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {TripStats | null}
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
  const cities = new Set(stops.map((stop) => `${stop.cc}/${stop.city}`));

  return {
    days: trip.days,
    cities: cities.size,
    km: Math.round(km),
    photos: stops.reduce((sum, stop) => sum + stop.photoCount, 0),
  };
}
