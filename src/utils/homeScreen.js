// 00 홈 화면에서만 쓰는 글자예요.

const MONTHS_PER_YEAR = 12;
// 헤드라인은 단어로 쓰는 게 피그마 00의 말투예요. 이보다 큰 수는 영어 단어가 길어져서 숫자로 써요.
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

function formatCount(count, unit) {
  return `${NUMBER_WORDS[count] ?? count} ${unit}${count === 1 ? '' : 's'}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function calcMonthsBetween(from, to) {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * MONTHS_PER_YEAR + toMonth - fromMonth;
}

/**
 * 헤드라인 위 작은 글자예요.
 *
 * @param {NonNullable<import('@/types').Journey['periods']>['all']} range
 * @returns {string} 예: '2024 — 2026  ·  WORLD JOURNEY'
 */
export function formatHomeEyebrow({ from, to }) {
  const fromYear = from.slice(0, 4);
  const toYear = to.slice(0, 4);
  const years = fromYear === toYear ? fromYear : `${fromYear} — ${toYear}`;
  return `${years}  ·  WORLD JOURNEY`;
}

/**
 * 두 줄 헤드라인이에요. 1년이 안 되면 달로 세요.
 *
 * @param {NonNullable<import('@/types').Journey['periods']>['all']} range
 * @param {number} cities
 * @returns {[string, string]} 예: ['Two years,', 'twelve cities.']
 */
export function formatHomeHeadline({ from, to }, cities) {
  const months = calcMonthsBetween(from, to);
  const duration =
    months < MONTHS_PER_YEAR
      ? formatCount(Math.max(1, months), 'month')
      : formatCount(Math.round(months / MONTHS_PER_YEAR), 'year');
  const cityText = cities === 1 ? 'one city' : `${NUMBER_WORDS[cities] ?? cities} cities`;
  return [`${capitalize(duration)},`, `${cityText}.`];
}

/**
 * 소개 글의 둘째 줄이에요.
 *
 * @param {import('@/types').JourneyTotals} totals
 * @returns {string} 예: '2024년 10월부터 지금까지, 1,284장의 사진이 지나온 길.'
 */
export function formatHomeIntro({ firstTripStart, photos }) {
  const { year, month } = firstTripStart;
  return `${year}년 ${month}월부터 지금까지, ${photos.toLocaleString('ko-KR')}장의 사진이 지나온 길.`;
}

/**
 * 00 왼쪽 아래 숫자 줄이에요. StatRow의 mini 모양에 넘겨요.
 *
 * @param {import('@/types').JourneyTotals} totals
 * @returns {{ value: string, label: string }[]}
 */
export function formatMiniStats({ cities, countries, km }) {
  return [
    { value: cities.toLocaleString('ko-KR'), label: 'CITIES' },
    { value: countries.toLocaleString('ko-KR'), label: 'COUNTRIES' },
    { value: km.toLocaleString('ko-KR'), label: 'KM FLOWN' },
  ];
}
