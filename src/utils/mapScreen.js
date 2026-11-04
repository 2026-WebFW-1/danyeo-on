// 01 지도 재생 화면에서만 쓰는 글자와 계산이에요.

import { DEFAULT_PERIOD, HOME_ID, PERIODS } from '@/constants/journey';
import { toLocalDate, toLocalYear } from '@/utils/localDate';

// 카드는 지금 지점과 앞 지점 둘까지 겹쳐요. 피그마 01 Arrival stack이 3장이에요.
const ARRIVAL_STACK_SIZE = 3;
// 첫 눈금은 타임라인 맨 왼쪽의 시작 연도예요. 다음 해 눈금이 이만큼 가까우면 글자가 겹쳐서 빼요.
const MIN_YEAR_TICK_GAP = 0.06;

/**
 * ?period= 값을 기간으로 바꿔요. 값이 없거나 모르는 값이면 기본 기간이에요.
 *
 * @param {string | null} value
 * @returns {'1y' | '2y' | 'all'}
 */
export function parsePeriod(value) {
  return PERIODS.includes(value) ? value : DEFAULT_PERIOD;
}

/**
 * @param {string} date 예: '2024-08-16'
 * @returns {string} 예: '2024년 8월'
 */
function formatYearMonth(date) {
  const [year, month] = date.split('-');
  return `${year}년 ${Number(month)}월`;
}

/**
 * 머리말에 쓰는 기간 글자예요.
 *
 * @param {{ from: string, to: string }} range
 * @returns {string} 예: '2024년 8월 – 2026년 8월'
 */
export function formatPeriodRange({ from, to }) {
  return `${formatYearMonth(from)} – ${formatYearMonth(to)}`;
}

/**
 * @param {string} iso 시간대가 붙은 시각
 * @returns {string} 예: '2026.02.14'
 */
export function formatDotDate(iso) {
  return toLocalDate(iso).replaceAll('-', '.');
}

/**
 * 범례에 쓰는 이동 수단별 구간 수예요.
 *
 * @param {import('@/types').Leg[]} legs
 * @returns {{ flight: number, train: number, car: number }}
 */
export function countLegsByMode(legs) {
  const counts = { flight: 0, train: 0, car: 0 };
  for (const leg of legs) counts[leg.mode] += 1;
  return counts;
}

/**
 * 구간의 from·to(집 또는 지점 ID)를 도시 이름으로 바꿔요.
 *
 * @param {import('@/types').Journey['home']} home
 * @param {import('@/types').Stop[]} stops
 * @param {string} placeId
 * @returns {string} 찾지 못하면 빈 문자열
 */
export function getPlaceName(home, stops, placeId) {
  if (placeId === HOME_ID) return home?.city ?? '';
  return stops.find((stop) => stop.id === placeId)?.city ?? '';
}

/**
 * 지금 머무는 지점과 앞 지점들을 도착 카드로 골라요. 맨 앞이 지금 지점이에요.
 * 지점에 도착해 머무는 동안(t: 1)만 있고, 집에 돌아왔거나 경유지면 빈 배열이에요.
 *
 * @param {import('@/types').Leg[]} legs
 * @param {import('@/types').Stop[]} stops
 * @param {import('@/utils/routeMap').RouteProgress | null} position
 * @returns {import('@/types').Stop[]}
 */
export function selectArrivalStops(legs, stops, position) {
  if (position?.t !== 1) return [];

  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const current = stopsById.get(legs[position.legIndex]?.to);
  if (!current || current.transit) return [];

  return legs
    .slice(0, position.legIndex + 1)
    .map((leg) => stopsById.get(leg.to))
    .filter((stop) => stop && !stop.transit)
    .slice(-ARRIVAL_STACK_SIZE)
    .reverse();
}

/**
 * 타임라인에 표시할 챕터 구간이에요. 지금 구간들로 도착하는 챕터 지점만 있어요.
 *
 * @param {import('@/types').Leg[]} legs
 * @param {import('@/types').Stop[]} stops
 * @returns {{ id: string, city: string, fromTime: number, toTime: number }[]}
 */
export function selectChapterSpans(legs, stops) {
  const arrivedIds = new Set(legs.map((leg) => leg.to));
  return stops
    .filter((stop) => stop.chapter && !stop.transit && arrivedIds.has(stop.id))
    .map((stop) => ({
      id: stop.id,
      city: stop.city,
      fromTime: Date.parse(stop.from),
      toTime: Date.parse(stop.to),
    }));
}

/**
 * 시각이 타임라인에서 어디쯤인지 0~1로 돌려줘요.
 *
 * @param {number} time
 * @param {number} fromTime 타임라인 맨 왼쪽
 * @param {number} toTime 타임라인 맨 오른쪽
 * @returns {number}
 */
export function calcAxisRatio(time, fromTime, toTime) {
  if (toTime <= fromTime) return 0;
  return Math.min(1, Math.max(0, (time - fromTime) / (toTime - fromTime)));
}

/**
 * 타임라인의 연도 눈금이에요. 맨 왼쪽에 시작 연도를 두고, 그 뒤로 해마다 1월 1일에 눈금을 둬요.
 *
 * @param {string} fromIso 타임라인 맨 왼쪽의 시각(시간대 포함)
 * @param {number} toTime 타임라인 맨 오른쪽(밀리초)
 * @returns {{ year: number, ratio: number }[]}
 */
export function calcYearTicks(fromIso, toTime) {
  const fromTime = Date.parse(fromIso);
  const startYear = Number(toLocalYear(fromIso));
  const ticks = [{ year: startYear, ratio: 0 }];

  for (let year = startYear + 1; Date.UTC(year, 0, 1) <= toTime; year += 1) {
    ticks.push({ year, ratio: calcAxisRatio(Date.UTC(year, 0, 1), fromTime, toTime) });
  }
  if (ticks.length > 1 && ticks[1].ratio < MIN_YEAR_TICK_GAP) ticks.shift();
  return ticks;
}
