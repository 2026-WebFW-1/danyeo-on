import {
  geoBounds,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

import { getCityKey } from '@/utils/cityKey';

// 피그마 00의 Globe 프레임은 900이고, 그 안의 공은 반지름 320이에요. 선 굵기도 이 크기 기준이에요.
export const GLOBE_SIZE = 900;
export const GLOBE_RADIUS = 320;

const EARTH_RADIUS_KM = 6371;
// 피그마 곡선 6개와 맞춰요. 여행이 59개인 계정도 경로를 알아볼 수 있게 수를 제한해요.
const MAX_ROUTES = 6;
// 이보다 가까우면 곡선이 집 표시 고리에 가려서 빼요. 서울-부산(약 325km)은 빠지고 서울-후쿠오카(약 530km)는 남아요.
const MIN_ROUTE_KM = 500;
// 피그마 00의 지구본은 북쪽으로 22° 기울어 있어요.
const GLOBE_TILT = 22;
// 여행이 없는 계정의 시작 경도예요. 피그마 00과 같아요.
const DEFAULT_CENTER_LNG = 155;
// 끌어서 돌릴 때 극을 넘어가면 위아래가 뒤집혀 보여서 여기서 멈춰요.
const MAX_TILT = 80;
const DEGREES_PER_PIXEL = 180 / (Math.PI * GLOBE_RADIUS);

// 점 사이 간격이에요. 경도 간격은 위도에 맞춰 넓혀서 극 근처에 점이 몰리지 않게 해요.
const LAND_DOT_STEP = 2.5;
// 남극은 지구본 아래쪽에 띠처럼 보여서 뺐어요. 피그마 00에도 없어요.
const LAND_DOT_SOUTH = -58;
const LAND_DOT_NORTH = 84;

const ROUTE_START_DELAY_MS = 600;
const ROUTE_DRAW_MS = 1400;
const ROUTE_GAP_MS = 400;
// 카드가 3장이라, 카드가 있는 경로만 굵게 그려요. 피그마 00도 3개만 굵어요.
export const ROUTE_CARD_COUNT = 3;

const ROUTE_POINT_RADIUS = 4;
const HOME_POINT_RADIUS = 6;
const HOME_RING_RADIUS = 13;

const projection = geoOrthographic()
  .scale(GLOBE_RADIUS)
  .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
  .clipAngle(90);
const path = geoPath(projection);
const graticule = geoGraticule().step([30, 30])();

let landDots = null;

/**
 * 지구본 위의 경로 하나예요. 여행 하나에 하나예요.
 *
 * @typedef {object} GlobeRoute
 * @property {string} id 여행 ID
 * @property {string} city 가장 오래 머문 도시
 * @property {[number, number]} coordinates [경도, 위도]
 * @property {string} tripName 예: '방콕 · 다낭'
 * @property {number} days 여행 일수
 * @property {string} from 여행 시작 시각
 */

/**
 * 지구본에 그릴 경로를 최근 여행부터 골라 시간 순서로 돌려줘요.
 * 같은 도시는 곡선이 겹치니 가장 최근 여행만 남겨요.
 *
 * @param {import('@/types').Journey | null} journey
 * @returns {GlobeRoute[]}
 */
export function selectGlobeRoutes(journey) {
  if (!journey?.home) return [];

  const home = [journey.home.lng, journey.home.lat];
  const stopsById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const routes = [];
  const seenCities = new Set();

  for (const trip of journey.trips.toReversed()) {
    if (routes.length === MAX_ROUTES) break;

    const candidates = trip.stopIds
      .map((id) => stopsById.get(id))
      .filter((stop) => stop && !stop.transit && calcKmFromHome(home, stop) >= MIN_ROUTE_KM);
    if (candidates.length === 0) continue;

    const stop = candidates.reduce((best, item) => (item.days > best.days ? item : best));
    const cityKey = getCityKey(stop);
    if (seenCities.has(cityKey)) continue;
    seenCities.add(cityKey);

    routes.push({
      id: trip.id,
      city: stop.city,
      coordinates: [stop.lng, stop.lat],
      tripName: trip.name,
      days: trip.days,
      from: trip.from,
    });
  }

  return routes.reverse();
}

function calcKmFromHome(home, stop) {
  return geoDistance(home, [stop.lng, stop.lat]) * EARTH_RADIUS_KM;
}

/**
 * 집과 경로가 앞면에 오도록 시작 회전값을 정해요. 위아래 기울기는 피그마 00과 같아요.
 *
 * @param {import('@/types').Journey['home']} home
 * @param {GlobeRoute[]} routes
 * @returns {[number, number]} d3 rotate 값
 */
export function calcInitialRotation(home, routes) {
  if (!home) return [-DEFAULT_CENTER_LNG, -GLOBE_TILT];

  const [centerLng] = geoCentroid({
    type: 'MultiPoint',
    coordinates: [[home.lng, home.lat], ...routes.map((route) => route.coordinates)],
  });
  return [-(Number.isFinite(centerLng) ? centerLng : home.lng), -GLOBE_TILT];
}

/**
 * 끌어서 돌린 뒤의 회전값이에요.
 *
 * @param {[number, number]} rotation
 * @param {number} deltaX 가로로 끈 픽셀
 * @param {number} deltaY 세로로 끈 픽셀
 * @returns {[number, number]}
 */
export function calcDraggedRotation([lambda, phi], deltaX, deltaY) {
  const nextPhi = phi - deltaY * DEGREES_PER_PIXEL;
  return [lambda + deltaX * DEGREES_PER_PIXEL, Math.max(-MAX_TILT, Math.min(MAX_TILT, nextPhi))];
}

/**
 * 시간이 지난 만큼 어디까지 그렸는지 계산해요. 경로를 하나 다 그리면 잠깐 쉬고 다음 경로로 가요.
 *
 * @param {number} elapsedMs 시작한 뒤 지난 시간
 * @param {number} routeCount
 * @returns {{ arrivedCount: number, current: { index: number, t: number } | null }}
 *   arrivedCount: 끝까지 그린 경로 수. current: 지금 그리는 경로. 그리는 중이 아니면 null
 */
export function calcRouteProgress(elapsedMs, routeCount) {
  const stepMs = ROUTE_DRAW_MS + ROUTE_GAP_MS;
  const sinceStart = Math.max(0, elapsedMs - ROUTE_START_DELAY_MS);
  const index = Math.floor(sinceStart / stepMs);
  if (index >= routeCount) return { arrivedCount: routeCount, current: null };

  const t = (sinceStart - index * stepMs) / ROUTE_DRAW_MS;
  if (t >= 1) return { arrivedCount: index + 1, current: null };
  return { arrivedCount: index, current: { index, t } };
}

/**
 * 모든 경로를 다 그릴 때까지 걸리는 시간이에요. 움직임을 줄이는 설정에서는 처음부터 이 시점을 보여 줘요.
 *
 * @param {number} routeCount
 * @returns {number}
 */
export function calcRouteDuration(routeCount) {
  return ROUTE_START_DELAY_MS + routeCount * (ROUTE_DRAW_MS + ROUTE_GAP_MS);
}

/**
 * 땅 위에 찍을 점의 좌표예요. 처음 한 번만 계산해요.
 * 큰 대륙은 geoContains가 느려서, 경계 상자 안에 든 점만 검사해요.
 *
 * @returns {[number, number][]} [경도, 위도] 목록
 */
export function getLandDots() {
  if (landDots) return landDots;

  const polygons = feature(world, world.objects.land).features.flatMap(({ geometry }) =>
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
      : [geometry],
  );
  const lands = polygons.map((polygon) => ({ polygon, bounds: geoBounds(polygon) }));

  const dots = [];
  for (let lat = LAND_DOT_SOUTH; lat <= LAND_DOT_NORTH; lat += LAND_DOT_STEP) {
    const lngStep = LAND_DOT_STEP / Math.cos((lat * Math.PI) / 180);
    for (let lng = -180; lng < 180; lng += lngStep) {
      const point = [lng, lat];
      if (
        lands.some((land) => isInBounds(point, land.bounds) && geoContains(land.polygon, point))
      ) {
        dots.push(point);
      }
    }
  }

  landDots = dots;
  return landDots;
}

function isInBounds([lng, lat], [[west, south], [east, north]]) {
  if (lat < south || lat > north) return false;
  // 날짜변경선을 걸친 땅은 서쪽 끝이 동쪽 끝보다 커요.
  return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;
}

/**
 * 점을 길이 0인 선으로 이어 붙여요. 둥근 선 끝이 점으로 그려져서, 원을 하나씩 쓰는 것보다 글자가 훨씬 짧아요.
 * 매 프레임 만드는 글자라 길이가 곧 성능이에요.
 *
 * @param {[number, number]} rotation
 * @returns {string} 앞면에 보이는 점의 path d
 */
function formatLandDots([lambda, phi]) {
  const centerLng = (-lambda * Math.PI) / 180;
  const centerLat = (-phi * Math.PI) / 180;
  const sinCenterLat = Math.sin(centerLat);
  const cosCenterLat = Math.cos(centerLat);

  let d = '';
  for (const point of getLandDots()) {
    const lng = (point[0] * Math.PI) / 180;
    const lat = (point[1] * Math.PI) / 180;
    const cosDistance =
      sinCenterLat * Math.sin(lat) + cosCenterLat * Math.cos(lat) * Math.cos(lng - centerLng);
    if (cosDistance > 0) {
      const [x, y] = projection(point);
      d += `M${x.toFixed(1)},${y.toFixed(1)}h0`;
    }
  }
  return d;
}

function formatRouteLines(home, routes) {
  if (routes.length === 0) return '';
  return (
    path({
      type: 'MultiLineString',
      coordinates: routes.map(({ coordinates, t = 1 }) => [
        home,
        geoInterpolate(home, coordinates)(t),
      ]),
    }) ?? ''
  );
}

function formatPoints(coordinates, radius) {
  if (coordinates.length === 0) return '';
  return path.pointRadius(radius)({ type: 'MultiPoint', coordinates }) ?? '';
}

/**
 * 지금 회전과 진행 상태로 지구본의 path d를 전부 만들어요. 뒤로 넘어간 부분은 잘려요.
 *
 * @param {[number, number]} rotation
 * @param {import('@/types').Journey['home']} homePlace
 * @param {GlobeRoute[]} routes
 * @param {ReturnType<typeof calcRouteProgress>} progress
 * @returns {{ graticule: string, land: string, thinRoutes: string, thickRoutes: string, routePoints: string, homeRing: string, homePoint: string }}
 */
export function calcGlobePaths(rotation, homePlace, routes, { arrivedCount, current }) {
  projection.rotate(rotation);

  const paths = { graticule: path(graticule) ?? '', land: formatLandDots(rotation) };
  if (!homePlace) {
    return {
      ...paths,
      thinRoutes: '',
      thickRoutes: '',
      routePoints: '',
      homeRing: '',
      homePoint: '',
    };
  }

  const home = [homePlace.lng, homePlace.lat];
  const arrived = routes.slice(0, arrivedCount);
  const thinCount = Math.max(0, arrivedCount - ROUTE_CARD_COUNT);
  const thick = arrived.slice(thinCount);
  if (current) thick.push({ ...routes[current.index], t: current.t });

  return {
    ...paths,
    thinRoutes: formatRouteLines(home, arrived.slice(0, thinCount)),
    thickRoutes: formatRouteLines(home, thick),
    routePoints: formatPoints(
      arrived.map((route) => route.coordinates),
      ROUTE_POINT_RADIUS,
    ),
    homeRing: formatPoints([home], HOME_RING_RADIUS),
    homePoint: formatPoints([home], HOME_POINT_RADIUS),
  };
}
