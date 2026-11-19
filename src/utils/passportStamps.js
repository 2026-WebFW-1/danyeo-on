import { HOME_COUNTRY_CC } from '@/constants/passport';
import { getCountryName } from '@/utils/countryName';
import { calcDaysBetween, toLocalDate } from '@/utils/localDate';

/**
 * 집을 나가서 돌아올 때까지의 지점을 차례로 모아요. 집에 안 들르고 다음 여행으로 이어진(gap 구간) 여행은 한 번의 외출로 합쳐요.
 * 사진이 14일 넘게 비면 Journey가 여행을 나누는데, 그 사이에도 같은 나라에 머물렀을 수 있어서예요(방콕 → 치앙마이).
 * 경유 지점과 나라 코드를 못 찾은 지점은 빼고, 지점마다 속한 여행 ID를 붙여요.
 * 기록(RECORDS)의 "가장 많이 간 나라"도 같은 기준으로 세려고 이 함수를 같이 써요.
 *
 * @param {import('@/types').Journey} journey
 * @returns {{ stop: import('@/types').Stop, tripId: string }[][]}
 */
export function groupOutings(journey) {
  const stopsById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const gapArrivals = new Set(
    journey.legs.filter((leg) => leg.kind === 'gap').map((leg) => leg.to),
  );
  const outings = [];

  for (const trip of journey.trips) {
    const stops = trip.stopIds
      .map((id) => stopsById.get(id))
      .filter((stop) => stop && !stop.transit && stop.cc)
      .map((stop) => ({ stop, tripId: trip.id }));
    const continuesOuting = trip.stopIds.some((id) => gapArrivals.has(id));

    if (continuesOuting && outings.length > 0) outings.at(-1).push(...stops);
    else outings.push(stops);
  }

  return outings;
}

/**
 * 05 입국 스탬프를 나라에 처음 들어간 순서로 돌려줘요. 여행이 없으면 빈 배열이에요.
 * 나라마다 하나예요. 같은 나라에 다시 가도 첫 입국만 찍고, 몇 번 갔는지는 기록(RECORDS)에서 세요.
 * 경유 지점, 나라 코드를 못 찾은 지점, 집이 있는 나라(HOME_COUNTRY_CC)의 지점은 빼요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {import('@/types').PassportStamp[]}
 */
export function selectPassportStamps(journey) {
  if (!journey) return [];

  const stamps = [];
  const seen = new Set();

  for (const visits of groupOutings(journey)) {
    visits.forEach(({ stop, tripId }, index) => {
      // 집 나라 지점은 스탬프만 안 찍고 목록에는 남겨요. 일본 → 한국 → 일본이면 첫 일본 체류가 한국에서 끊겨요.
      if (stop.cc === HOME_COUNTRY_CC || seen.has(stop.cc)) return;
      seen.add(stop.cc);

      // 체류는 이번 입국에서 그 나라를 떠날 때까지예요. 밴쿠버 → 밴프처럼 이어서 머문 도시를 합쳐요.
      // 지점마다 days를 더하면 도시를 옮긴 날이 두 번 세져서, 첫 지점의 시작과 마지막 지점의 끝으로 세요.
      const nextCountryIndex = visits.findIndex((next, i) => i > index && next.stop.cc !== stop.cc);
      const lastStop =
        visits[(nextCountryIndex === -1 ? visits.length : nextCountryIndex) - 1].stop;

      stamps.push({
        cc: stop.cc,
        country: stop.country || getCountryName(stop.cc) || stop.cc,
        tripId,
        enteredOn: toLocalDate(stop.from),
        days: calcDaysBetween(stop.from, lastStop.to) + 1,
      });
    });
  }

  return stamps;
}
