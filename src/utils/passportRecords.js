import { HOME_COUNTRY_CC, RECORD_CITY_LIMIT } from '@/constants/passport';
import { getCityKey } from '@/utils/cityKey';
import { getCountryName } from '@/utils/countryName';
import { calcDistanceKm } from '@/utils/distance';
import { toLocalDate } from '@/utils/localDate';
import { groupOutings } from '@/utils/passportStamps';

/**
 * 지점의 나라 이름이에요. 이름을 못 찾았으면 스탬프와 같이 나라 코드로 찾아요.
 *
 * @param {Pick<import('@/types').Stop, 'cc' | 'country'>} stop
 * @returns {string}
 */
function getStopCountry(stop) {
  return stop.country || getCountryName(stop.cc) || stop.cc;
}

/**
 * 가장 큰 값을 가진 첫 항목을 골라요. 같은 값이면 먼저 나온 항목이 이겨요(먼저 간 곳이에요).
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} getValue
 * @returns {T | null} 비어 있으면 null
 */
function pickMax(items, getValue) {
  let best = null;
  for (const item of items) {
    if (best === null || getValue(item) > getValue(best)) best = item;
  }
  return best;
}

/**
 * 따로 나간 횟수가 가장 많은 나라를 골라요. 집이 있는 나라는 스탬프처럼 빼요.
 * 집에 안 들르고 이어진 여행(gap 구간)은 한 번 나간 거라, 스탬프와 같은 groupOutings로 묶어서 세요.
 *
 * @param {import('@/types').Journey} journey
 * @returns {import('@/types').PassportRecords['mostVisited']}
 */
function selectMostVisited(journey) {
  // Map은 넣은 순서를 지켜서, 횟수가 같으면 먼저 들어간 나라가 앞에 남아요.
  const countries = new Map();

  for (const visits of groupOutings(journey)) {
    const countedHere = new Set();
    for (const { stop } of visits) {
      if (stop.cc === HOME_COUNTRY_CC) continue;
      if (!countries.has(stop.cc)) countries.set(stop.cc, { visits: 0, stops: [] });
      const country = countries.get(stop.cc);
      country.stops.push(stop);
      if (!countedHere.has(stop.cc)) {
        countedHere.add(stop.cc);
        country.visits += 1;
      }
    }
  }

  const [cc, best] = pickMax([...countries], ([, country]) => country.visits) ?? [];
  if (!best) return null;

  const cityKeys = new Set();
  const cities = [];
  for (const stop of best.stops) {
    if (cityKeys.has(getCityKey(stop))) continue;
    cityKeys.add(getCityKey(stop));
    cities.push(stop.city);
  }

  return {
    cc,
    country: getStopCountry(best.stops[0]),
    visits: best.visits,
    cities,
    // 대표 사진은 그 나라에서 사진을 가장 많이 남긴 지점의 것을 써요.
    coverStop: pickMax(best.stops, (stop) => stop.photoCount),
  };
}

/**
 * 05 기록(RECORDS) 세 칸의 값을 골라요. 고를 지점이 없으면 그 칸은 null이에요.
 *  - longestStay: 가장 오래 머문 지점
 *  - farthest: 집에서 직선거리가 가장 먼 지점. 집을 모르면(home이 null) null이에요
 *  - mostVisited: 따로 나간 횟수가 가장 많은 나라
 * 경유 지점은 머문 곳이 아니라서 모두 빼요. 같은 값이면 먼저 간 곳을 골라요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {import('@/types').PassportRecords}
 */
export function selectPassportRecords(journey) {
  if (!journey) return { longestStay: null, farthest: null, mostVisited: null };

  const stops = journey.stops.filter((stop) => !stop.transit);
  const longest = pickMax(stops, (stop) => stop.days);
  const mostPhotos = pickMax(stops, (stop) => stop.photoCount);
  const { home } = journey;
  const farthestStop = home ? pickMax(stops, (stop) => calcDistanceKm(home, stop)) : null;

  return {
    longestStay: longest && {
      stop: longest,
      // 사진 수가 같은 지점이 앞에 있어도 이 지점도 "가장 많은" 건 맞아서, 지점이 아니라 수로 비교해요.
      hasMostPhotos: longest.photoCount > 0 && longest.photoCount === mostPhotos.photoCount,
    },
    farthest: farthestStop && {
      stop: farthestStop,
      km: Math.round(calcDistanceKm(home, farthestStop)),
      homeCity: home.city,
    },
    mostVisited: selectMostVisited(journey),
  };
}

/**
 * 도시 이름을 " · "로 이어요. 너무 많으면 앞의 몇 곳만 두고 나머지는 "외 N곳"으로 줄여요.
 *
 * @param {string[]} cities
 * @returns {string} 예: '후쿠오카 · 교토 · 도쿄 · 삿포로 · 오사카'
 */
function formatCities(cities) {
  if (cities.length <= RECORD_CITY_LIMIT) return cities.join(' · ');
  const shown = cities.slice(0, RECORD_CITY_LIMIT - 1);
  return `${shown.join(' · ')} 외 ${cities.length - shown.length}곳`;
}

/**
 * 기록 세 칸을 카드에 들어갈 글자로 바꿔요. null인 기록은 카드를 만들지 않아요.
 * 설명은 피그마의 손으로 쓴 문장 대신 데이터에서 나온 사실만 적어요.
 *
 * @param {import('@/types').PassportRecords} records selectPassportRecords의 결과
 * @returns {import('@/types').PassportRecordCard[]} label은 key로 써요
 */
export function formatPassportRecords({ longestStay, farthest, mostVisited }) {
  const cards = [];

  if (longestStay) {
    const { stop, hasMostPhotos } = longestStay;
    const photoNote = hasMostPhotos ? ` 가장 많은 사진(${stop.photoCount}장)도 여기서.` : '';
    // 이름을 못 찾은 곳(UNKNOWN_PLACE)은 나라 이름도 코드도 비어서, "에서"로 시작하지 않게 나라 구절을 빼요.
    const country = getStopCountry(stop);
    const stay = country
      ? `${country}에서 ${stop.days}일, 사진 ${stop.photoCount}장을 남겼어요.`
      : `${stop.days}일 동안 사진 ${stop.photoCount}장을 남겼어요.`;
    cards.push({
      label: 'LONGEST STAY',
      value: `${stop.city} · ${stop.days}일`,
      description: `${stay}${photoNote}`,
      coverFileKey: stop.coverFileKey,
    });
  }

  if (farthest) {
    const { stop, km, homeCity } = farthest;
    const arrivedOn = toLocalDate(stop.from).replaceAll('-', '.');
    cards.push({
      label: 'FARTHEST',
      value: `${stop.city} · ${km.toLocaleString('en-US')}km`,
      description: `${homeCity}에서 가장 멀리 간 곳이에요. ${arrivedOn}에 도착했어요.`,
      coverFileKey: stop.coverFileKey,
    });
  }

  if (mostVisited) {
    const { country, visits, cities, coverStop } = mostVisited;
    cards.push({
      label: 'MOST VISITED',
      value: `${country} · ${visits}회`,
      description: formatCities(cities),
      coverFileKey: coverStop.coverFileKey,
    });
  }

  return cards;
}
