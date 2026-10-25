// 시각은 '2025-07-12T10:00:00-07:00'처럼 현지 시간대가 붙은 문자열이에요.
// Date로 바꾸면 브라우저 시간대에 따라 연말·연초나 월말 지점의 날짜가 밀릴 수 있어서, 앞부분을 그대로 잘라 써요.
const DATE_LENGTH = 'YYYY-MM-DD'.length;
const MONTH_LENGTH = 'YYYY-MM'.length;
const YEAR_LENGTH = 'YYYY'.length;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 현지 날짜만 남겨요.
 *
 * @param {string} iso 시간대가 붙은 시각
 * @returns {string} 예: '2025-07-12'
 */
export function toLocalDate(iso) {
  return iso.slice(0, DATE_LENGTH);
}

/**
 * 현지 연·월만 남겨요.
 *
 * @param {string} iso 시간대가 붙은 시각
 * @returns {string} 예: '2025-07'
 */
export function toLocalMonth(iso) {
  return iso.slice(0, MONTH_LENGTH);
}

/**
 * 현지 연도만 남겨요.
 *
 * @param {string} iso 시간대가 붙은 시각
 * @returns {string} 예: '2025'
 */
export function toLocalYear(iso) {
  return iso.slice(0, YEAR_LENGTH);
}

/**
 * 현지 날짜를 UTC 자정의 밀리초로 바꿔요. UTC는 서머타임이 없어서 하루가 항상 24시간이에요.
 *
 * @param {string} iso 시간대가 붙은 시각
 * @returns {number}
 */
export function toUtcDay(iso) {
  const [year, month, day] = toLocalDate(iso).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * 두 시각의 현지 날짜가 며칠 떨어져 있는지 돌려줘요. 같은 날이면 0이에요.
 *
 * @param {string} fromIso 시간대가 붙은 시각
 * @param {string} toIso 시간대가 붙은 시각
 * @returns {number}
 */
export function calcDaysBetween(fromIso, toIso) {
  return (toUtcDay(toIso) - toUtcDay(fromIso)) / MS_PER_DAY;
}
