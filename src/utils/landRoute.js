import { ISLAND_REGIONS, LANDMASS_BY_CC, NO_LAND_ROUTE_CCS } from '@/constants/landRoutes';

/**
 * 좌표가 든 섬 지역의 이름이에요. 섬이 아니면 null이에요.
 *
 * @param {{ lat?: number, lng?: number }} place
 * @returns {string | null}
 */
function findIslandRegion({ lat, lng }) {
  const region = ISLAND_REGIONS.find(
    (box) => lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east,
  );
  return region?.name ?? null;
}

/**
 * 두 곳 사이를 육로로 갈 수 없는지예요(기능 명세 §7의 2번: 대륙이 다르거나 바다를 건넘).
 * 아는 것만으로 판단해요. 나라 코드나 좌표가 없으면(#179 전에 저장된 집 등) 그 규칙은 건너뛰어요.
 *
 *  - 나라가 다르고, 땅덩이가 다르거나 한쪽이 육로 없는 나라면 true. 예: 서울 → 후쿠오카
 *  - 한쪽만 섬 지역이거나 서로 다른 섬 지역이면 true. 예: 서울 → 제주
 *
 * @param {{ cc?: string, lat?: number, lng?: number }} from
 * @param {{ cc?: string, lat?: number, lng?: number }} to
 * @returns {boolean}
 */
export function hasNoLandRoute(from, to) {
  if (from.cc && to.cc && from.cc !== to.cc) {
    if (NO_LAND_ROUTE_CCS.has(from.cc) || NO_LAND_ROUTE_CCS.has(to.cc)) return true;

    const fromLandmass = LANDMASS_BY_CC.get(from.cc);
    const toLandmass = LANDMASS_BY_CC.get(to.cc);
    if (fromLandmass && toLandmass && fromLandmass !== toLandmass) return true;
  }

  return findIslandRegion(from) !== findIslandRegion(to);
}
