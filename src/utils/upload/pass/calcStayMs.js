import { getPassKind } from '@/utils/upload/pass/getPassKind';

// 확실한 사진은 볼 필요가 없어서 흐름만 느껴질 만큼 빠르게 지나갑니다.
const FAST_MS = 300;
// 편집본 앞뒤에서 미리 줄였다가 풀어서, 갑자기 멈췄다 출발하는 느낌을 줄여요.
const NEAR_MS = 700;
// 편집본이 원본 옆에 들어가는 걸 눈으로 확인할 시간이에요.
const SLOW_MS = 1600;

/**
 * index번 사진에 머무르는 시간이에요. 편집본은 느리게, 그 바로 옆은 중간, 나머지는 빠르게 지나가요.
 * @param {import('@/types').PilePhoto[]} photos
 * @param {number} index
 * @returns {number} ms
 */
export function calcStayMs(photos, index) {
  if (isSlowAt(photos, index)) return SLOW_MS;
  const isBeforeShow = isSlowAt(photos, index - 1);
  const isAfterShow = isSlowAt(photos, index + 1);
  if (isBeforeShow || isAfterShow) return NEAR_MS;

  return FAST_MS;
}

/** index 자리에 느리게 지나갈 사진이 있는지. 줄 밖(-1, length)이면 false예요. */
function isSlowAt(photos, index) {
  const photo = photos[index];
  // 줄 밖이면 photo가 없어서 getPassKind를 부르기 전에 걸러야 해요.
  return photo !== undefined && getPassKind(photo) === 'show';
}
