// takenAt은 '2024-07-03T10:15:42'처럼 시간대 없는 현지 시각이라, Date를 거치지 않고 잘라 써요.
// Date로 바꾸면 브라우저 시간대에 따라 날짜가 밀릴 수 있어요(localDate.js와 같은 이유).
const MONTH_DAY = [5, 10];
const HOUR_MINUTE = [11, 16];
// 촬영 시각이 없는 사진의 날짜 자리예요(#204).
const NO_DATE = '--.--';

/**
 * 촬영 날짜를 MM.DD로 보여 줘요. 촬영 시각이 없으면 --.--예요.
 *
 * @param {string | null | undefined} takenAt 시간대 없는 현지 시각
 * @returns {string} 예: '07.03'
 */
export function formatPassDate(takenAt) {
  if (!takenAt) return NO_DATE;
  return takenAt.slice(...MONTH_DAY).replace('-', '.');
}

/**
 * 촬영 날짜와 시각을 MM.DD HH:mm으로 보여 줘요. 촬영 시각이 없으면 null이에요.
 *
 * @param {string | null | undefined} takenAt 시간대 없는 현지 시각
 * @returns {string | null} 예: '07.03 10:15'
 */
export function formatPassDateTime(takenAt) {
  if (!takenAt) return null;
  return `${formatPassDate(takenAt)} ${takenAt.slice(...HOUR_MINUTE)}`;
}
