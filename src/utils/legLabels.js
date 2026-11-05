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
// RouteMap이 그리는 지점 점의 반지름이에요(r 3.25 + 흰 테두리 절반).
const STOP_DOT_RADIUS = 4;

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
 * @param {[number, number]} point 지도 좌표
 * @param {number} radius
 * @returns {MapRect}
 */
function calcPointRect([x, y], radius) {
  return { left: x - radius, right: x + radius, top: y - radius, bottom: y + radius };
}

/**
 * 라벨을 놓아 볼 자리를 먼저 쓸 순서로 돌려줘요.
 * 짧은 구간은 양 끝 점이 가운데 바로 옆에 있어서, 가운데 위가 막히면 양 끝 점의 위나 아래로 비켜요.
 *
 * @param {import('@/types').Leg} leg 기차·차 구간
 * @returns {MapRect[]}
 */
function calcLabelCandidates(leg) {
  const rect = calcLegLabelRect(leg);
  const clearance = STOP_DOT_RADIUS + LABEL_GAP;
  const endYs = [0, 1].map((t) => mapProjection(calcLegPoint(leg, t))[1]);
  const aboveBottom = Math.min(...endYs) - clearance;
  const belowTop = Math.max(...endYs) + clearance;
  return [
    rect,
    { ...rect, top: aboveBottom - LABEL_HEIGHT, bottom: aboveBottom },
    { ...rect, top: belowTop, bottom: belowTop + LABEL_HEIGHT },
  ];
}

/**
 * 재생 범위 전체에서 구간 라벨의 자리를 정해요. 비행은 라벨이 없어요.
 * 라벨은 집 표시와 지점 점을 가리지 않고, 먼저 지나온 라벨이 자리를 차지해요. 놓을 자리가 없으면 숨겨요.
 * 아직 도착하지 않은 지점의 점도 미리 피해요. 범위 전체로 정해 두고 지나온 구간만 그리면
 * 재생이 진행돼도 보이던 라벨이 옮겨 가거나 사라지지 않아요.
 *
 * @param {import('@/types').Leg[]} legs 재생 범위의 구간, 시간 순서
 * @param {import('@/types').Journey['home']} home
 * @param {import('@/types').Stop[]} stops
 * @returns {{ leg: import('@/types').Leg, rect: MapRect }[]}
 */
export function selectVisibleLegLabels(legs, home, stops) {
  const routeStopIds = new Set(legs.flatMap((leg) => [leg.from, leg.to]));
  const occupied = stops
    .filter((stop) => !stop.transit && routeStopIds.has(stop.id))
    .map((stop) => calcPointRect(mapProjection([stop.lng, stop.lat]), STOP_DOT_RADIUS));
  if (home) {
    occupied.push(calcPointRect(mapProjection([home.lng, home.lat]), HOME_RING_RADIUS));
  }

  return legs.flatMap((leg) => {
    if (leg.mode === 'flight') return [];
    const rect = calcLabelCandidates(leg).find((candidate) =>
      occupied.every((other) => !isOverlapping(candidate, other)),
    );
    if (!rect) return [];
    occupied.push(rect);
    return [{ leg, rect }];
  });
}
