import { selectPassportTrips } from '@/utils/passportTrips';
import { EARTH_CIRCUMFERENCE_KM } from '@/constants/passport';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { calcTravelHours } from '@/utils/legMode';
import { calcDaysBetween } from '@/utils/localDate';

/**
 * 05 Passport 통계 6칸의 숫자를 계산해요. 여행이 0개면 전부 0이에요.
 * km · flights · countries · cities · photos는 selectJourneyTotals와 같은 값이에요(00·03과 숫자가 같게요).
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {import('@/types').PassportStats}
 */
export function selectPassportStats(journey) {
  const totals = selectJourneyTotals(journey);
  const legs = journey?.legs ?? [];
  const trips = selectPassportTrips(journey);

  // 사진으로 시각을 잰 구간은 공항에서 기다린 시간까지 들어 있어서(방콕 → 다낭 20.5시간),
  // 기내에 있던 시간은 모든 비행 구간을 거리 ÷ 속도로 똑같이 추정해 더해요.
  const flightHours = legs
    .filter((leg) => leg.mode === 'flight')
    .reduce((sum, leg) => sum + calcTravelHours(leg.km, 'flight'), 0);

  // "집 밖에서 잔 날"이라 여행마다 첫날과 마지막 날을 다 센 일수에서 하루를 빼요. 당일치기는 0박이에요.
  // 사진이 14일 넘게 비어 여행이 나뉘어도 집에 안 들렀으면(gap 구간) 그 사이도 밖에서 잔 밤이라 더해요.
  const tripNights = trips.reduce((sum, trip) => sum + Math.max(trip.days - 1, 0), 0);
  const gapNights = legs
    .filter((leg) => leg.kind === 'gap')
    .reduce((sum, leg) => sum + calcDaysBetween(leg.departAt, leg.arriveAt), 0);
  const nightsAway = tripNights + gapNights;

  return {
    km: totals.km,
    flights: totals.flights,
    flightHours: Math.round(flightHours),
    nightsAway,
    countries: totals.countries,
    cities: totals.cities,
    photos: totals.photos,
  };
}

/**
 * 통계를 6칸에 들어갈 글자로 바꿔요. 큰 수는 천 단위 쉼표를 넣고, 브라우저 언어와 상관없이 같은 모양이에요.
 *
 * @param {import('@/types').PassportStats} stats selectPassportStats의 결과
 * @returns {{ label: string, value: string, note: string }[]} label은 key로 써요
 */
export function formatPassportStats({
  km,
  flights,
  flightHours,
  nightsAway,
  countries,
  cities,
  photos,
}) {
  const laps = (km / EARTH_CIRCUMFERENCE_KM).toFixed(1);
  const format = (value) => value.toLocaleString('en-US');

  return [
    { label: 'KM', value: format(km), note: `지구 ${laps}바퀴` },
    { label: 'FLIGHTS', value: format(flights), note: '편도 기준' },
    { label: 'HOURS', value: format(flightHours), note: '기내에서' },
    { label: 'DAYS AWAY', value: format(nightsAway), note: '집 밖에서 잔 날' },
    { label: 'COUNTRIES', value: format(countries), note: `${format(cities)}개 도시` },
    { label: 'PHOTOS', value: format(photos), note: '위치 기록된 사진' },
  ];
}
