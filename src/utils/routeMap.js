import { geoInterpolate, geoMercator } from 'd3-geo';

// 피그마 01은 1440 폭 화면에 경도 360°를 다 펼친 메르카토르 지도예요.
// 같은 폭으로 그려야 선 굵기·점 크기를 피그마 숫자 그대로 쓸 수 있어요.
const MAP_WIDTH = 1440;
// 피그마 01처럼 태평양을 가운데 둬요(동경 150°). 지도 가장자리는 서경 30°가 돼요.
const MAP_CENTER_LNG = 150;
// 메르카토르는 극으로 갈수록 끝없이 늘어나서, 피그마 01에 보이는 범위로 위아래를 잘라요.
const MAP_NORTH = 76;
const MAP_SOUTH = -62;

/**
 * 01 지도 재생의 투영(위도·경도 → 화면 좌표)이에요. viewBox도 이 크기를 써요.
 * 위도 MAP_NORTH가 y = 0, MAP_SOUTH가 y = height예요.
 */
export const mapProjection = geoMercator()
  .rotate([-MAP_CENTER_LNG, 0])
  .scale(MAP_WIDTH / (2 * Math.PI))
  .translate([MAP_WIDTH / 2, 0]);
mapProjection.translate([MAP_WIDTH / 2, -mapProjection([MAP_CENTER_LNG, MAP_NORTH])[1]]);

export const MAP_SIZE = {
  width: MAP_WIDTH,
  height: Math.round(mapProjection([MAP_CENTER_LNG, MAP_SOUTH])[1]),
};

/**
 * 01 지도 재생의 진행 위치예요. usePlayback의 position과 같은 모양이에요.
 *
 * @typedef {object} RouteProgress
 * @property {number} legIndex 지금 그리고 있는 구간 번호(0부터)
 * @property {number} t 그 구간에서 온 비율. 0 = 출발, 1 = 도착
 */

/**
 * 진행 위치로 나눈 구간들이에요.
 *
 * @typedef {object} SplitLegs
 * @property {import('@/types').Leg[]} done 끝까지 다 그린 구간
 * @property {{ leg: import('@/types').Leg, t: number } | null} current 지금 그리는 구간. 다 그렸거나 구간이 없으면 null
 * @property {import('@/types').Leg[]} upcoming 아직 그리지 않는 구간
 */

/**
 * 우리 데이터의 [위도, 경도]를 d3가 쓰는 [경도, 위도]로 바꿔요.
 * Leg.fromLatLng·toLatLng를 d3에 넘길 때는 꼭 이 함수를 거쳐요.
 *
 * @param {[number, number]} latLng
 * @returns {[number, number]}
 */
export function toLngLat([lat, lng]) {
  return [lng, lat];
}

/**
 * 진행 위치를 기준으로 구간을 셋으로 나눠요.
 * progress가 null이거나 legIndex가 구간 수를 넘으면 모든 구간을 다 그린 상태예요.
 *
 * @param {import('@/types').Leg[]} legs 시간 순서대로
 * @param {RouteProgress | null} progress
 * @returns {SplitLegs}
 */
export function splitByProgress(legs, progress) {
  if (!progress || progress.legIndex >= legs.length) {
    return { done: legs, current: null, upcoming: [] };
  }

  const legIndex = Math.max(0, progress.legIndex);
  const t = Math.min(1, Math.max(0, progress.t));

  return {
    done: legs.slice(0, legIndex),
    current: { leg: legs[legIndex], t },
    upcoming: legs.slice(legIndex + 1),
  };
}

/**
 * 구간의 출발에서 t만큼 간 지점을 [경도, 위도]로 돌려줘요.
 * 지도에 그리는 선과 같은 대권(가장 짧은 경로) 위의 점이에요.
 *
 * @param {import('@/types').Leg} leg
 * @param {number} t 0 = 출발, 1 = 도착
 * @returns {[number, number]}
 */
export function calcLegPoint(leg, t) {
  return geoInterpolate(toLngLat(leg.fromLatLng), toLngLat(leg.toLatLng))(t);
}

/**
 * 구간의 t 지점에서 지도 위 진행 방향을 각도로 돌려줘요. 0° = 오른쪽(동), 90° = 아래(남).
 * 이동 수단 아이콘을 선 방향으로 돌릴 때 써요.
 *
 * @param {import('@/types').Leg} leg
 * @param {number} t
 * @returns {number} 도(degree)
 */
export function calcLegAngle(leg, t) {
  const step = 0.01;
  const [x1, y1] = mapProjection(calcLegPoint(leg, Math.max(0, t - step)));
  const [x2, y2] = mapProjection(calcLegPoint(leg, Math.min(1, t + step)));
  let dx = x2 - x1;
  // 앞뒤 점이 지도 가장자리(서경 30°)의 양쪽으로 갈리면 한 바퀴 돌려서 이어 봐요
  if (Math.abs(dx) > MAP_SIZE.width / 2) dx -= Math.sign(dx) * MAP_SIZE.width;
  return (Math.atan2(y2 - y1, dx) * 180) / Math.PI;
}

/**
 * 지금까지 도착한(또는 지금 떠나는) 지점 ID를 모아요. 지도에는 이 지점만 점으로 찍어요.
 * 아직 가지 않은 곳이 미리 보이면 재생하는 의미가 없어서예요.
 *
 * @param {SplitLegs} split splitByProgress의 결과
 * @returns {Set<string>} 'home'은 빠져 있어요
 */
export function calcReachedStopIds({ done, current }) {
  const ids = new Set(done.flatMap((leg) => [leg.from, leg.to]));
  if (current) {
    ids.add(current.leg.from);
    if (current.t === 1) ids.add(current.leg.to);
  }
  ids.delete('home');
  return ids;
}

/**
 * 구간의 fromT부터 toT까지를 GeoJSON LineString으로 만들어요.
 * d3의 geoPath는 LineString의 두 점을 대권 곡선으로 이어 그리고,
 * 지도 가장자리를 넘으면 알아서 잘라 줘요.
 *
 * @param {import('@/types').Leg} leg
 * @param {number} [fromT]
 * @param {number} [toT]
 * @returns {{ type: 'LineString', coordinates: [number, number][] }}
 */
export function toLegLine(leg, fromT = 0, toT = 1) {
  return {
    type: 'LineString',
    coordinates: [calcLegPoint(leg, fromT), calcLegPoint(leg, toT)],
  };
}
