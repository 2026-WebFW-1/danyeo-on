// 01 지도 위 기차·차 구간 라벨의 글자와 자리를 계산해요. 좌표는 지도 viewBox(1440 폭) 기준이에요.

import { formatInbound } from '@/utils/formatInbound';
import { canEditLegMode } from '@/utils/legMode';
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
 * 라벨이 가리면 안 되는 집 표시와 지점 점의 자리예요. 경유지는 점이 없어서 빼요.
 *
 * @param {import('@/types').Leg[]} legs 이 구간들이 지나는 지점만 봐요
 * @param {import('@/types').Journey['home']} home
 * @param {import('@/types').Stop[]} stops
 * @returns {MapRect[]}
 */
function calcMarkerRects(legs, home, stops) {
  const routeStopIds = new Set(legs.flatMap((leg) => [leg.from, leg.to]));
  const rects = stops
    .filter((stop) => !stop.transit && routeStopIds.has(stop.id))
    .map((stop) => calcPointRect(mapProjection([stop.lng, stop.lat]), STOP_DOT_RADIUS));
  if (home) {
    rects.push(calcPointRect(mapProjection([home.lng, home.lat]), HOME_RING_RADIUS));
  }
  return rects;
}

/**
 * 구간들의 라벨 자리를 정해요. 비행은 라벨이 없어요.
 * 다만 사용자가 비행으로 고친 구간은 라벨을 남겨요. 라벨이 이동 수단을 다시 고치는 입구라서요.
 * 자리는 이동 수단을 고칠 수 있는 구간(canEditLegMode)이 먼저, 그 안에서는 먼저 지나온 구간이 먼저 차지해요.
 * 왕복은 가는 선과 오는 선이 겹쳐서, 시간 순서대로만 주면 고칠 수 없는 가는 구간(집 → 지점)이 늘 자리를 가져가요.
 * 놓을 자리가 없으면 숨겨요.
 *
 * @param {import('@/types').Leg[]} legs 시간 순서
 * @param {MapRect[]} markerRects 라벨이 가리면 안 되는 자리(calcMarkerRects)
 * @returns {{ leg: import('@/types').Leg, rect: MapRect }[]} 시간 순서
 */
function placeLegLabels(legs, markerRects) {
  const occupied = [...markerRects];
  const labelLegs = legs.filter((leg) => leg.mode !== 'flight' || leg.modeSource === 'user');
  const placingOrder = [
    ...labelLegs.filter((leg) => canEditLegMode(leg)),
    ...labelLegs.filter((leg) => !canEditLegMode(leg)),
  ];
  const rectByLegId = new Map();
  for (const leg of placingOrder) {
    const rect = calcLabelCandidates(leg).find((candidate) =>
      occupied.every((other) => !isOverlapping(candidate, other)),
    );
    if (!rect) continue;
    occupied.push(rect);
    rectByLegId.set(leg.id, rect);
  }

  return labelLegs
    .filter((leg) => rectByLegId.has(leg.id))
    .map((leg) => ({ leg, rect: rectByLegId.get(leg.id) }));
}

/**
 * 재생 범위 전체에서 구간 라벨의 자리를 정해요. 다 그린 상태(끝까지 재생 · 고치기 모드)에서 보여 줄 라벨이에요.
 * 라벨은 서로 겹치지 않고 집 표시와 지점 점을 가리지 않아요. 자리를 정하는 순서는 placeLegLabels에 있어요.
 * 재생 중에는 여행별로 따로 정한 자리를 써요(selectLegLabelsByTrip).
 *
 * @param {import('@/types').Leg[]} legs 재생 범위의 구간, 시간 순서
 * @param {import('@/types').Journey['home']} home
 * @param {import('@/types').Stop[]} stops
 * @returns {{ leg: import('@/types').Leg, rect: MapRect }[]} 시간 순서
 */
export function selectVisibleLegLabels(legs, home, stops) {
  return placeLegLabels(legs, calcMarkerRects(legs, home, stops));
}

/**
 * 구간이 속한 여행이에요. 집을 안 들르고 온 구간(gap)은 tripId가 없어서 도착한 지점의 여행으로 봐요.
 * selectLegsByTrip과 같은 기준이에요.
 *
 * @param {import('@/types').Leg} leg
 * @param {import('@/types').Stop[]} stops
 * @returns {string | null}
 */
function findLegTripId(leg, stops) {
  return leg.tripId ?? stops.find((stop) => stop.id === leg.to)?.tripId ?? null;
}

/**
 * 재생 중에 보여 줄 라벨의 자리를 여행별로 정해요. 재생 중에는 지금 여행의 라벨만 보여서(selectLabelsAtProgress),
 * 화면에 없는 다른 여행의 라벨에 자리를 내주지 않아요. 범위 전체로 정한 자리를 그대로 쓰면
 * 앞선 여행의 라벨이 차지한 곳에서 지금 여행의 라벨이 안 나와요(#256 리뷰).
 * 지점 점은 그 여행이 끝날 때까지 찍히는 것만 피해요. 그 여행에서 아직 도착하지 않은 지점의 점도 미리 피해서,
 * 그 여행을 재생하는 동안에는 보이던 라벨이 옮겨 가거나 사라지지 않아요.
 * 그래서 범위의 첫 여행은 그 여행만 재생(?trip=)할 때와 자리가 같아요.
 *
 * @param {import('@/types').Leg[]} legs 재생 범위의 구간, 시간 순서
 * @param {import('@/types').Journey['home']} home
 * @param {import('@/types').Stop[]} stops
 * @returns {Map<string | null, { leg: import('@/types').Leg, rect: MapRect }[]>} 여행 ID → 그 여행의 라벨, 시간 순서
 */
export function selectLegLabelsByTrip(legs, home, stops) {
  const tripIds = legs.map((leg) => findLegTripId(leg, stops));
  const labelsByTripId = new Map();
  for (const tripId of new Set(tripIds)) {
    const tripLegs = legs.filter((_leg, index) => tripIds[index] === tripId);
    const legsUntilTripEnd = legs.slice(0, tripIds.lastIndexOf(tripId) + 1);
    labelsByTripId.set(
      tripId,
      placeLegLabels(tripLegs, calcMarkerRects(legsUntilTripEnd, home, stops)),
    );
  }
  return labelsByTripId;
}

/**
 * 재생 위치에서 보여 줄 라벨을 골라요.
 * 재생 중이면 지금 여행의 라벨 가운데 도착한 구간만이에요. 기간 재생(1Y · 2Y · ALL)에서
 * 앞선 여행의 라벨이 끝까지 남으면 지금 구간의 라벨처럼 보여서요(#256).
 * 끝까지 재생했거나 고치기 모드처럼 다 그린 상태(current: null)면 범위 전체의 라벨을 모두 돌려줘요.
 *
 * @param {object} labels
 * @param {{ leg: import('@/types').Leg, rect: MapRect }[]} labels.all selectVisibleLegLabels의 결과
 * @param {Map<string | null, { leg: import('@/types').Leg, rect: MapRect }[]>} labels.byTripId selectLegLabelsByTrip의 결과
 * @param {import('@/utils/routeMap').SplitLegs} split splitByProgress의 결과
 * @param {import('@/types').Stop[]} stops
 * @returns {{ leg: import('@/types').Leg, rect: MapRect }[]}
 */
export function selectLabelsAtProgress({ all, byTripId }, { done, current }, stops) {
  const arrivedLegIds = new Set(done.map((leg) => leg.id));
  if (!current) return all.filter(({ leg }) => arrivedLegIds.has(leg.id));

  if (current.t === 1) arrivedLegIds.add(current.leg.id);
  const tripLabels = byTripId.get(findLegTripId(current.leg, stops)) ?? [];
  return tripLabels.filter(({ leg }) => arrivedLegIds.has(leg.id));
}
