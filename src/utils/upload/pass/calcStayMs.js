// 전체가 이 시간 안에 끝나도록 장 수로 나눠 정합니다.
// 240장이 넘으면 MIN_MS에 걸려서, 300장이면 약 1분 15초가 걸려요.
const TOTAL_MS = 60_000;
// 처음엔 300ms에서 멀미가 났지만, 그땐 사진이 커졌다 작아지고 편집본에서 느려졌어요.
// 크기와 속도가 바뀌지 않게 한 뒤라 250까지 내렸어요. 더 내리면 멀미가 나는지 다시 봐야 해요.
const MIN_MS = 250;
// 사진이 적을 때 너무 오래 머물지 않게 막아요. 400이어도 24장에서 느리게 느껴졌어요.
const MAX_MS = 300;

/**
 * 사진 한 장에 머무는 시간이에요. 사진이 많을수록 빨라져요.
 * 편집본도 같은 빠르기로 지나가요. 편집본만 느리게 하면 하나 지날 때마다 흐름이 오래 끊겨서,
 * 속도 대신 카드 색과 라벨로 알려요(PassStrip).
 * @param {import('@/types').PilePhoto[]} photos
 * @returns {number} ms
 */
export function calcStayMs(photos) {
  return Math.min(MAX_MS, Math.max(MIN_MS, TOTAL_MS / photos.length));
}
