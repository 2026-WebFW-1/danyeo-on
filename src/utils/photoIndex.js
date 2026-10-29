// 목록 안의 번호로 쓸 수 있는 값인지 봐요. 숫자가 아니거나 목록 밖이면 쓸 수 없어요.
function isValidIndex(index, length) {
  return Number.isInteger(index) && index >= 0 && index < length;
}

/**
 * 한 장 앞 사진의 번호예요. 첫 사진이면 null이에요(끝에서 처음으로 돌지 않아요).
 * 쓸 수 없는 번호도 null이라, 부르는 쪽이 null이면 "이전" 버튼을 숨기면 돼요.
 *
 * @param {number | null | undefined} index 지금 보는 사진의 번호
 * @param {number} length 사진 수
 * @returns {number | null}
 */
export function getPrevIndex(index, length) {
  return isValidIndex(index, length) && index > 0 ? index - 1 : null;
}

/**
 * 한 장 뒤 사진의 번호예요. 마지막 사진이면 null이에요(처음으로 돌지 않아요).
 *
 * @param {number | null | undefined} index 지금 보는 사진의 번호
 * @param {number} length 사진 수
 * @returns {number | null}
 */
export function getNextIndex(index, length) {
  return isValidIndex(index, length) && index < length - 1 ? index + 1 : null;
}
