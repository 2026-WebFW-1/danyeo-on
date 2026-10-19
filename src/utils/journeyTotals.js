/**
 * 전체 여행을 한꺼번에 센 합계예요. 03 머리말과 00 홈의 통계 줄이 같은 값을 써요.
 *
 * @typedef {object} JourneyTotals
 * @property {number} stops 지점 수. 경유 지점은 빼요
 * @property {number} trips 여행 수
 * @property {number} cities 도시 수. 같은 도시에 여러 번 가도 한 번만 세요
 * @property {number} countries 나라 수
 * @property {number} km 이동 거리 합. 집을 안 들르고 가는 구간(gap)까지 모든 구간을 더하고, 반올림한 정수예요
 * @property {number} photos 사진 수. 경유 지점의 사진은 빼요
 * @property {number} flights 비행기로 이동한 구간 수
 * @property {{ year: number, month: number } | null} firstTripStart 첫 여행을 시작한 연·월. 여행이 없으면 null
 */

// 여행이 하나도 없을 때 돌려줄 값이에요. 화면이 빈 상태를 따로 계산하지 않도록 0으로 채워요.
const EMPTY_TOTALS = {
  stops: 0,
  trips: 0,
  cities: 0,
  countries: 0,
  km: 0,
  photos: 0,
  flights: 0,
  firstTripStart: null,
};

/**
 * 전체 여행의 합계를 계산해요. journey가 없거나 여행이 0개면 전부 0이에요.
 * 경유 지점은 지점·도시·나라·사진 수에서 빼요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {JourneyTotals}
 */
export function selectJourneyTotals(journey) {
  if (!journey || journey.trips.length === 0) return { ...EMPTY_TOTALS };

  const stops = journey.stops.filter((stop) => !stop.transit);

  // 도시 이름만 보면 다른 나라의 같은 이름을 하나로 세므로 나라 코드를 같이 묶어요.
  const cities = new Set(stops.map((stop) => `${stop.cc}/${stop.city}`));
  const countries = new Set(stops.map((stop) => stop.cc));

  const km = journey.legs.reduce((sum, leg) => sum + leg.km, 0);

  // 여행은 시간 순서로 들어 있어서 첫 번째가 가장 이른 여행이에요.
  // from은 '2024-07-11T20:10:08+07:00'처럼 현지 시간대가 붙은 문자열이에요.
  // Date로 바꾸면 브라우저 시간대에 따라 월이 달라질 수 있어서 앞 7글자(YYYY-MM)를 잘라 써요.
  const [year, month] = journey.trips[0].from.slice(0, 7).split('-').map(Number);

  return {
    stops: stops.length,
    trips: journey.trips.length,
    cities: cities.size,
    countries: countries.size,
    km: Math.round(km),
    photos: stops.reduce((sum, stop) => sum + stop.photoCount, 0),
    flights: journey.legs.filter((leg) => leg.mode === 'flight').length,
    firstTripStart: { year, month },
  };
}
