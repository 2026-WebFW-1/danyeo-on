import { MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '@/constants/mapZoom';
import { MAP_SIZE } from '@/utils/routeMap';

// 01 지도 확대 상태의 계산이에요. 화면·이벤트와 상관없이 숫자만 다뤄요. 이벤트를 받는 건 useMapZoom이 해요.
// 좌표는 모두 지도 viewBox(1440 × 799) 기준이에요. 지도 위 점 p는 화면(viewBox)에서 k·p + (x, y)에 그려져요.

/**
 * 지도 확대 상태예요. k는 배율, x·y는 확대한 지도를 옮긴 만큼(viewBox 단위)이에요.
 *
 * @typedef {object} MapZoom
 * @property {number} k
 * @property {number} x
 * @property {number} y
 */

/** 확대하지 않은 상태예요. @type {MapZoom} */
export const IDENTITY_ZOOM = Object.freeze({ k: 1, x: 0, y: 0 });

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 배율을 1 ~ MAP_MAX_ZOOM 안에 두고, 지도 밖(빈 곳)이 보이지 않게 옮긴 만큼을 막아요.
 * 확대한 지도가 viewBox를 늘 다 덮도록 x는 W·(1 − k) ~ 0, y는 H·(1 − k) ~ 0이에요.
 *
 * @param {MapZoom} zoom
 * @returns {MapZoom}
 */
export function clampZoom({ k, x, y }) {
  const nextK = clamp(k, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
  return {
    k: nextK,
    x: clamp(x, MAP_SIZE.width * (1 - nextK), 0),
    y: clamp(y, MAP_SIZE.height * (1 - nextK), 0),
  };
}

/**
 * 화면의 한 점을 그대로 둔 채 factor배 확대(1보다 작으면 축소)해요. 휠은 포인터 자리, 버튼은 화면 가운데예요.
 *
 * @param {MapZoom} zoom
 * @param {number} factor
 * @param {[number, number]} [center] viewBox 좌표. 없으면 화면 가운데
 * @returns {MapZoom}
 */
export function zoomAt(zoom, factor, center = [MAP_SIZE.width / 2, MAP_SIZE.height / 2]) {
  const [cx, cy] = center;
  const k = clamp(zoom.k * factor, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
  // 가운데 점 아래의 지도 위치가 확대 전후로 같도록 옮겨요.
  const ratio = k / zoom.k;
  return clampZoom({ k, x: cx - (cx - zoom.x) * ratio, y: cy - (cy - zoom.y) * ratio });
}

/**
 * 끈 만큼 지도를 옮겨요.
 *
 * @param {MapZoom} zoom
 * @param {number} dx viewBox 단위
 * @param {number} dy viewBox 단위
 * @returns {MapZoom}
 */
export function panBy(zoom, dx, dy) {
  return clampZoom({ k: zoom.k, x: zoom.x + dx, y: zoom.y + dy });
}

/**
 * 지도 위 점이 확대한 화면(viewBox)에서 어디에 그려지는지예요.
 *
 * @param {MapZoom} zoom
 * @param {[number, number]} point
 * @returns {[number, number]}
 */
export function applyZoom({ k, x, y }, [px, py]) {
  return [k * px + x, k * py + y];
}

/**
 * 확대한 지도 안에서 (x, y)를 중심으로 다시 1/k배 줄이는 transform이에요.
 * 점 · 아이콘 · 라벨은 자리만 지도를 따라가고 화면 크기는 그대로 두려고 써요.
 *
 * @param {number} k
 * @param {number} x
 * @param {number} y
 * @returns {string | undefined} 확대하지 않았으면 undefined
 */
export function unscaleAt(k, x, y) {
  if (k === 1) return undefined;
  return `translate(${x} ${y}) scale(${1 / k}) translate(${-x} ${-y})`;
}
