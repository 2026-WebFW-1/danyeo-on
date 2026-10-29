import { getCityKey } from '@/utils/cityKey';
import { toLocalMonth } from '@/utils/localDate';

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
 * @returns {import('@/types').JourneyTotals}
 */
export function selectJourneyTotals(journey) {
  if (!journey || journey.trips.length === 0) return { ...EMPTY_TOTALS };

  const stops = journey.stops.filter((stop) => !stop.transit);

  // 도시 이름만 보면 다른 나라의 같은 이름을 하나로 세므로 나라 코드를 같이 묶어요.
  const cities = new Set(stops.map(getCityKey));
  // 나라 코드가 빈 지점(이름을 못 찾은 곳)은 나라가 아니라서 빼요.
  const countries = new Set(stops.map((stop) => stop.cc).filter(Boolean));

  const km = journey.legs.reduce((sum, leg) => sum + leg.km, 0);

  // 여행은 시간 순서로 들어 있어서 첫 번째가 가장 이른 여행이에요.
  // Date로 바꾸면 브라우저 시간대에 따라 월이 달라질 수 있어서, 현지 연·월을 문자열로 잘라 써요.
  const [year, month] = toLocalMonth(journey.trips[0].from).split('-').map(Number);

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
