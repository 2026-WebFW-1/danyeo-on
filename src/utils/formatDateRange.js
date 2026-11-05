import { toLocalDate } from '@/utils/localDate';

const RANGE_SEPARATOR = ' — ';

/**
 * 시작과 끝 날짜를 한 줄 글자로 바꿔요. 03 도시 블록의 날짜 범위예요.
 * 같은 해면 끝은 월·일만, 해가 바뀌면 연도까지, 같은 날이면 하루만 적어요.
 * 시간대가 붙은 시각은 Date로 바꾸지 않고 현지 날짜를 그대로 잘라 써서, 브라우저 시간대에 날짜가 밀리지 않아요.
 *
 * @param {string} fromIso 시간대가 붙은 시각이나 'YYYY-MM-DD'
 * @param {string} toIso 시간대가 붙은 시각이나 'YYYY-MM-DD'
 * @returns {string} 예: '2025.01.03 — 03.05', '2024.12.30 — 2025.01.02', '2025.03.06'
 */
export function formatDateRange(fromIso, toIso) {
  const [fromYear, fromMonth, fromDay] = toLocalDate(fromIso).split('-');
  const [toYear, toMonth, toDay] = toLocalDate(toIso).split('-');

  const start = `${fromYear}.${fromMonth}.${fromDay}`;
  if (fromYear === toYear && fromMonth === toMonth && fromDay === toDay) return start;
  if (fromYear === toYear) return `${start}${RANGE_SEPARATOR}${toMonth}.${toDay}`;
  return `${start}${RANGE_SEPARATOR}${toYear}.${toMonth}.${toDay}`;
}
