import { getPassKind } from '@/utils/upload/pass/getPassKind';

// 일반 사진은 전체가 이 시간 안에 끝나도록 장 수로 나눠 정합니다.
// 225장이 넘으면 FAST_MIN_MS에 걸려서, 300장이면 약 2분이 걸려요.
const FAST_TOTAL_MS = 90_000;
// 사진 줄이 쉬지 않고 흘러서, 이보다 짧으면(1초에 540px 넘게 흐르면) 멀미가 났어요.
const FAST_MIN_MS = 400;
// 사진이 적을 때 너무 오래 머물지 않게 막아요.
const FAST_MAX_MS = 600;
// 편집본 앞뒤에서 한 단계 늦춰서, 흐르던 줄이 갑자기 느려지는 느낌을 줄여요.
const NEAR_MS = 1000;
// 편집본이 원본 옆에 들어가는 걸 눈으로 확인할 시간이에요.
const SLOW_MS = 1800;

/**
 * index번 사진에 머무르는 시간이에요. 편집본은 느리게, 그 바로 옆은 중간, 나머지는 빠르게 지나가요.
 * 나머지(일반 사진)는 사진이 많을수록 빨라져요.
 * @param {import('@/types').PilePhoto[]} photos
 * @param {number} index
 * @returns {number} ms
 */
export function calcStayMs(photos, index) {
  if (isSlowAt(photos, index)) return SLOW_MS;
  const isBeforeShow = isSlowAt(photos, index - 1);
  const isAfterShow = isSlowAt(photos, index + 1);
  if (isBeforeShow || isAfterShow) return NEAR_MS;

  return Math.min(FAST_MAX_MS, Math.max(FAST_MIN_MS, FAST_TOTAL_MS / photos.length));
}

/** index 자리에 느리게 지나갈 사진이 있는지. 줄 밖(-1, length)이면 false예요. */
function isSlowAt(photos, index) {
  const photo = photos[index];
  // 줄 밖이면 photo가 없어서 getPassKind를 부르기 전에 걸러야 해요.
  return photo !== undefined && getPassKind(photo) === 'show';
}
