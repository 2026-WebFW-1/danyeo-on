import { formatPassDate } from './formatPassDate';

// takenAt은 시간대 없는 현지 시각이라 시·분도 Date를 거치지 않고 잘라 써요(formatPassDate와 같은 이유).
const HOUR_MINUTE = [11, 16];

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
