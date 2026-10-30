const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * 두 좌표 사이의 직선 거리(km)예요. 지구를 둥글게 보고 계산해서 날짜변경선이나 극 근처도 맞아요.
 *
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {number}
 */
export function calcDistanceKm(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;

  // 반대편 지점에서 소수점 오차로 a가 1을 살짝 넘으면 asin이 NaN이 돼서 1로 막아요.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
