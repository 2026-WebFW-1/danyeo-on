import { TRANSIT_AIRPORT_KM, TRANSIT_MAX_STAY_HOURS } from '@/constants/photoSort';
import { calcDistanceKm } from '@/utils/distance';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * 경유로 보이는 지점의 ID를 골라요(기능 명세 C107). 07a가 경유로 표시할지 물어볼 지점이에요.
 *
 * 셋 다 맞아야 해요.
 *  - 머문 시간이 6시간 미만이에요. 그 지점의 첫 사진부터 마지막 사진까지라, 사진이 한 장이면 0시간이에요.
 *  - 대형 · 중형 공항에서 3km 안이에요. 머문 시간만 보면 한 장만 찍고 지나간 도시가 모두 걸려요.
 *  - 비행기로 와서 비행기로 떠났어요. 시내가 공항 3km 안인 도시(토론토, 후쿠오카 등)에 내려 차로 옮겨 간 곳은
 *    갈아탄 게 아니라서 빼요. 이 조건은 명세에 없고 #197에서 더했어요.
 *
 * 이미 경유인 지점은 이동 구간이 없어서 고르지 않아요. 그 여행에 다른 도시가 남는지는 표를 만드는 쪽(selectSortTrips)이 봐요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {{ lat: number, lng: number }[]} airports 대형 · 중형 공항(airportService). 못 받았으면 빈 배열
 * @returns {Set<string>} 지점 ID
 */
export function selectTransitCandidateIds(journey, airports) {
  if (!journey || airports.length === 0) return new Set();

  const flights = journey.legs.filter((leg) => leg.mode === 'flight');
  const arrivedByFlight = new Set(flights.map((leg) => leg.to));
  const leftByFlight = new Set(flights.map((leg) => leg.from));
  const isShortStay = (stop) =>
    (Date.parse(stop.to) - Date.parse(stop.from)) / MS_PER_HOUR < TRANSIT_MAX_STAY_HOURS;
  const isNearAirport = (stop) =>
    airports.some((airport) => calcDistanceKm(stop, airport) <= TRANSIT_AIRPORT_KM);

  return new Set(
    journey.stops
      .filter(
        (stop) =>
          arrivedByFlight.has(stop.id) &&
          leftByFlight.has(stop.id) &&
          isShortStay(stop) &&
          isNearAirport(stop),
      )
      .map((stop) => stop.id),
  );
}
