// 목록 번호는 두 자리로 맞춰요('01', '12'). 세 자리 이상은 그대로예요.
const NO_LENGTH = 2;

/**
 * 번호를 두 자리 문자열로 바꿔요.
 *
 * @param {number} no
 * @returns {string} 예: 3 → '03'
 */
export function formatNo(no) {
  return String(no).padStart(NO_LENGTH, '0');
}
