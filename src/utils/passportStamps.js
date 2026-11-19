import { HOME_COUNTRY_CC } from '@/constants/passport';
import { getCountryName } from '@/utils/countryName';
import { calcDaysBetween, toLocalDate } from '@/utils/localDate';

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

  const stopsById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const stamps = [];
  const seen = new Set();

  for (const trip of journey.trips) {
    const stops = trip.stopIds
      .map((id) => stopsById.get(id))
      .filter((stop) => stop && !stop.transit && stop.cc);

    stops.forEach((stop, index) => {
      // 집 나라 지점은 스탬프만 안 찍고 목록에는 남겨요. 일본 → 한국 → 일본이면 첫 일본 체류가 한국에서 끊겨요.
      if (stop.cc === HOME_COUNTRY_CC || seen.has(stop.cc)) return;
      seen.add(stop.cc);

      // 체류는 이번 입국에서 그 나라를 떠날 때까지예요. 밴쿠버 → 밴프처럼 이어서 머문 도시를 합쳐요.
      // 지점마다 days를 더하면 도시를 옮긴 날이 두 번 세져서, 첫 지점의 시작과 마지막 지점의 끝으로 세요.
      const nextCountryIndex = stops.findIndex((next, i) => i > index && next.cc !== stop.cc);
      const lastStop = stops[(nextCountryIndex === -1 ? stops.length : nextCountryIndex) - 1];

      stamps.push({
        cc: stop.cc,
        country: stop.country || getCountryName(stop.cc) || stop.cc,
        tripId: trip.id,
        enteredOn: toLocalDate(stop.from),
        days: calcDaysBetween(stop.from, lastStop.to) + 1,
      });
    });
  }

  return stamps;
}
