// 01 지도 위 기차·차 구간 라벨의 글자와 자리를 계산해요. 좌표는 지도 viewBox(1440 폭) 기준이에요.

import { formatInbound } from '@/utils/formatInbound';
import { calcLegPoint, mapProjection } from '@/utils/routeMap';

const LABEL_HEIGHT = 26;
// 라벨이 선을 가리지 않게 구간 가운데보다 조금 위에 놓아요.
const LABEL_OFFSET_Y = 6;
// 글자를 재려면 화면에 그려 봐야 해서 피그마 01 라벨의 글자 크기에 맞춘 어림값을 써요.
const LABEL_CHROME_WIDTH = 36; // 여백·테두리·이모지
const HANGUL_WIDTH = 11;
const SPACE_WIDTH = 3;
const LATIN_WIDTH = 6.5;
// 어림값이 조금 틀려도 맞닿지 않게 라벨 사이에 두는 틈이에요.
const LABEL_GAP = 4;
// RouteMap이 그리는 집 표시의 바깥 동그라미 반지름이에요.
const HOME_RING_RADIUS = 16.25;

/**
 * @typedef {object} MapRect
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 */

/**
 * @param {string} text
 * @returns {number}
 */
function estimateLabelWidth(text) {
  let width = LABEL_CHROME_WIDTH;
  for (const char of text) {
    if (char === ' ') width += SPACE_WIDTH;
    else width += /[가-힣]/.test(char) ? HANGUL_WIDTH : LATIN_WIDTH;
  }
  return width;
}

/**
 * 구간 라벨이 지도에서 차지하는 자리예요. 구간 가운데 바로 위예요.
 *
 * @param {import('@/types').Leg} leg 기차·차 구간
 * @returns {MapRect}
 */
export function calcLegLabelRect(leg) {
  const [x, y] = mapProjection(calcLegPoint(leg, 0.5));
  const width = estimateLabelWidth(formatInbound(leg));
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - LABEL_HEIGHT - LABEL_OFFSET_Y,
    bottom: y - LABEL_OFFSET_Y,
  };
}

/**
 * @param {MapRect} a
 * @param {MapRect} b
 * @returns {boolean}
 */
function isOverlapping(a, b) {
  return (
    a.left < b.right + LABEL_GAP &&
    b.left < a.right + LABEL_GAP &&
    a.top < b.bottom + LABEL_GAP &&
    b.top < a.bottom + LABEL_GAP
  );
}

/**
 * 지도에 보여 줄 구간 라벨을 골라요. 비행은 라벨이 없어요.
 * 먼저 지나온 라벨이 자리를 차지하고, 그 자리나 집 표시와 겹치는 뒤 라벨은 숨겨요.
 * 그래서 재생이 진행돼도 이미 보이던 라벨이 사라지거나 다시 나타나지 않아요.
 *
 * @param {import('@/types').Leg[]} legs 지나온 구간, 시간 순서
 * @param {import('@/types').Journey['home']} home
 * @returns {import('@/types').Leg[]}
 */
export function selectVisibleLegLabels(legs, home) {
  const occupied = [];
  if (home) {
    const [x, y] = mapProjection([home.lng, home.lat]);
    occupied.push({
      left: x - HOME_RING_RADIUS,
      right: x + HOME_RING_RADIUS,
      top: y - HOME_RING_RADIUS,
      bottom: y + HOME_RING_RADIUS,
    });
  }

  return legs.filter((leg) => {
    if (leg.mode === 'flight') return false;
    const rect = calcLegLabelRect(leg);
    if (occupied.some((other) => isOverlapping(rect, other))) return false;
    occupied.push(rect);
    return true;
  });
}
