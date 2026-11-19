import { FAR_DAYS, NEAR_DAYS, THUMB_COUNT } from '@/constants/onThisDay';
import { toLocalDate, toLocalYear, toUtcDay } from '@/utils/localDate';
import { selectStopPhotos } from '@/utils/selectStopPhotos';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 1~10년 전은 피그마(ONE YEAR AGO)처럼 영어 단어로 쓰고, 그보다 오래되면 숫자로 써요.
const YEAR_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

/**
 * 00b 한 장면이에요. 한 해에 하나씩 있어요.
 *
 * @typedef {object} OnThisDayItem
 * @property {import('@/types').Stop} stop 그 해 이맘때 머문 지점
 * @property {number} yearsAgo 몇 년 전 이맘때인지. 예: 1
 * @property {number} daysLeft 지점 시작일의 yearsAgo주년까지 남은 날. 당일이면 0, 지났으면 음수
 */

const pad = (number) => String(number).padStart(2, '0');
const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * 날짜의 해만 바꿔요. 그 해에 2월 29일이 없으면 2월 28일이에요.
 *
 * @param {string} date 'YYYY-MM-DD'
 * @param {number} year
 * @returns {string} 'YYYY-MM-DD'
 */
function withYear(date, year) {
  const [, month, day] = date.split('-');
  const isMissingLeapDay = month === '02' && day === '29' && !isLeapYear(year);
  return `${year}-${month}-${isMissingLeapDay ? '28' : day}`;
}

/**
 * 그 날짜가 지점에 머문 기간에서 며칠 떨어져 있는지예요. 머문 기간 안이면 0이에요.
 *
 * @param {number} day toUtcDay로 바꾼 날짜
 * @param {import('@/types').Stop} stop
 * @returns {number}
 */
function daysFromStop(day, stop) {
  const from = toUtcDay(stop.from);
  const to = toUtcDay(stop.to);
  if (day < from) return (from - day) / MS_PER_DAY;
  if (day > to) return (day - to) / MS_PER_DAY;
  return 0;
}

/**
 * 주소의 ?today= 값을 읽어요. 'YYYY-MM-DD' 모양의 있는 날짜가 아니면 null이라서, 진짜 오늘을 쓰면 돼요.
 *
 * @param {string | null | undefined} value
 * @returns {string | null} 예: '2026-11-19'
 */
export function parseTodayParam(value) {
  const match = DATE_PATTERN.exec(value ?? '');
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? value : null;
}

/**
 * 이 PC의 오늘 날짜예요. 지점 날짜는 현지 날짜 그대로 쓰지만, 오늘은 보는 사람의 날짜라서 PC 시간대를 써요.
 *
 * @param {Date} [now]
 * @returns {string} 예: '2026-11-19'
 */
export function getLocalToday(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 오늘로부터 1년 전, 2년 전… 같은 날 이맘때 머문 지점을 골라요(피그마 00b). 경유 지점은 빼요.
 *
 *  - 해마다 그 해 같은 날에서 가장 가까운 지점을 하나 찾아요. 같은 거리면 먼저 온 지점이에요.
 *  - NEAR_DAYS(±3일) 안인 해를 모두 1년 전부터 오래된 순서로 돌려줘요.
 *  - 그런 해가 하나도 없으면 FAR_DAYS(±14일) 안에서 가장 가까운 해 하나만 돌려줘요. 같은 거리면 최근 해예요.
 *  - 그것도 없으면 빈 배열이라서, 00b를 그리지 않으면 돼요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} today 'YYYY-MM-DD'
 * @returns {OnThisDayItem[]}
 */
export function selectOnThisDay(journey, today) {
  const stops = journey?.stops.filter((stop) => !stop.transit) ?? [];
  if (stops.length === 0) return [];

  const todayYear = Number(today.slice(0, 4));
  // 연초의 오늘은 그 전 해 연말에 시작한 지점과 가까워서, 가장 오래된 지점의 한 해 앞까지 봐요.
  const oldestYear = Math.min(...stops.map((stop) => Number(toLocalYear(stop.from)))) - 1;

  const closestByYear = [];
  for (let year = todayYear - 1; year >= oldestYear; year -= 1) {
    const day = toUtcDay(withYear(today, year));
    let closest = null;
    stops.forEach((stop) => {
      const days = daysFromStop(day, stop);
      if (!closest || days < closest.days) closest = { stop, days };
    });
    closestByYear.push({ ...closest, yearsAgo: todayYear - year });
  }

  const near = closestByYear.filter(({ days }) => days <= NEAR_DAYS);
  // toSorted는 같은 거리끼리 순서를 지켜서, 최근 해가 앞에 남아요.
  const picked =
    near.length > 0
      ? near
      : closestByYear
          .filter(({ days }) => days <= FAR_DAYS)
          .toSorted((a, b) => a.days - b.days)
          .slice(0, 1);

  return picked.map(({ stop, yearsAgo }) => {
    const start = toLocalDate(stop.from);
    const anniversary = withYear(start, Number(toLocalYear(start)) + yearsAgo);
    return {
      stop,
      yearsAgo,
      daysLeft: (toUtcDay(anniversary) - toUtcDay(today)) / MS_PER_DAY,
    };
  });
}

/**
 * D-day 칩의 글자예요. 예: 'D-9 · 1주년', 'D-DAY · 1주년', 'D+3 · 2주년'
 *
 * @param {Pick<OnThisDayItem, 'daysLeft' | 'yearsAgo'>} item
 * @returns {string}
 */
export function formatAnniversary({ daysLeft, yearsAgo }) {
  let dday = 'D-DAY';
  if (daysLeft > 0) dday = `D-${daysLeft}`;
  if (daysLeft < 0) dday = `D+${-daysLeft}`;
  return `${dday} · ${yearsAgo}주년`;
}

/**
 * 맨 위 작은 영어 글자예요. 예: 'ONE YEAR AGO', 'TWO YEARS AGO', '12 YEARS AGO'
 *
 * @param {number} yearsAgo
 * @returns {string}
 */
export function formatYearsAgo(yearsAgo) {
  const count = YEAR_WORDS[yearsAgo - 1] ?? String(yearsAgo);
  return `${count} ${yearsAgo === 1 ? 'YEAR' : 'YEARS'} AGO`;
}

/**
 * 큰 제목이에요. 연도는 지점이 시작한 해예요. 예: '교토, 2024.'
 *
 * @param {Pick<import('@/types').Stop, 'city' | 'from'>} stop
 * @returns {string}
 */
export function formatOnThisDayTitle(stop) {
  return `${stop.city}, ${toLocalYear(stop.from)}.`;
}

/**
 * 제목 아래 한 줄이에요. 예: '2년 전 이맘때, 교토에 있었어요.'
 *
 * @param {Pick<OnThisDayItem, 'stop' | 'yearsAgo'>} item
 * @returns {string}
 */
export function formatOnThisDayLead({ stop, yearsAgo }) {
  return `${yearsAgo}년 전 이맘때, ${stop.city}에 있었어요.`;
}

/**
 * 큰 사진 옆의 작은 사진이에요. 대표 사진을 뺀 지점 사진의 앞 THUMB_COUNT장(촬영 순서)이에요.
 * 사진 목록을 아직 못 받았으면 빈 배열이에요.
 *
 * @param {import('@/types').Stop} stop
 * @param {import('@/types').Photo[]} photos 로그인한 사람의 사진 전부
 * @returns {import('@/types').PhotoRef[]}
 */
export function selectThumbPhotos(stop, photos) {
  return selectStopPhotos(stop, photos)
    .filter((photo) => !stop.coverFileKey || photo.fileKey !== stop.coverFileKey)
    .slice(0, THUMB_COUNT);
}
