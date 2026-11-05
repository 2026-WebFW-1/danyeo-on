import {
  DOT_MAX_PX,
  DOT_MIN_PX,
  DOT_PX_PER_DAY,
  KM_PER_LINE_PX,
  LINE_BASE_PX,
  LINE_MAX_PX,
  LINE_MIN_PX,
} from '@/constants/places';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 구간 거리에 맞는 세로선 굵기(px)를 돌려줘요. 03 도시 블록 사이의 선이에요.
 * 멀수록 굵고 정해 둔 범위 안에서만 변해요. 거리를 모르면 가장 가는 선이에요.
 *
 * @param {number | null | undefined} km
 * @returns {number} 예: 573 → 1.2, 2815 → 약 1.64, 8159 → 약 2.85
 */
export function calcLineWidth(km) {
  if (!Number.isFinite(km) || km <= 0) return LINE_MIN_PX;
  return clamp(LINE_BASE_PX + km / KM_PER_LINE_PX, LINE_MIN_PX, LINE_MAX_PX);
}

/**
 * 머문 날 수에 맞는 점 지름(px)을 돌려줘요. 오래 머물수록 크고 정해 둔 범위 안에서만 변해요.
 *
 * @param {number | null | undefined} days
 * @returns {number} 예: 5 → 약 10.67, 12 → 11.6, 62 → 18
 */
export function calcDotSize(days) {
  if (!Number.isFinite(days) || days <= 0) return DOT_MIN_PX;
  return clamp(DOT_MIN_PX + days * DOT_PX_PER_DAY, DOT_MIN_PX, DOT_MAX_PX);
}
