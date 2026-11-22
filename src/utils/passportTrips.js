import { calcDaysBetween, toLocalDate } from '@/utils/localDate';

/**
 * 05 여권에서 쓰는 연속 여행 구간이에요. 실제 귀가를 거친 합치기만 나누고 원래 여행 ID는 유지해요.
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {{id: string, from: string, to: string, days: number, stopIds: string[]}[]}
 */
export function selectPassportTrips(journey) {
  if (!journey) return [];
  const stops = new Map((journey.stops ?? []).map((stop) => [stop.id, stop]));
  // 구버전 Journey에는 외출 시작 지점이 없어서, 첫 방문 이후에 집에서 다시 출발한 구간을 찾아요.
  const departures = new Set(
    (journey.legs ?? []).filter((leg) => leg.kind === 'outbound').map((leg) => leg.to),
  );
  return (journey.trips ?? []).flatMap((trip) => {
    const ids = trip.stopIds ?? [];
    const firstVisit = ids.findIndex((id) => !stops.get(id)?.transit);
    const starts = new Set(
      trip.outingStartIds ?? ids.slice(firstVisit + 1).filter((id) => departures.has(id)),
    );
    if (!starts.size) return [trip];

    const outings = [];
    let visits = [];
    for (const id of ids) {
      if (starts.has(id)) visits = [];
      if (!visits.length) outings.push(visits);
      visits.push(stops.get(id));
    }
    return outings.map((segment) => {
      const dates = segment
        .flatMap((stop) => [toLocalDate(stop.from), toLocalDate(stop.to)])
        .sort();
      return {
        id: trip.id,
        stopIds: segment.map((stop) => stop.id),
        from: segment[0].from,
        to: segment.at(-1).to,
        days: calcDaysBetween(dates[0], dates.at(-1)) + 1,
      };
    });
  });
}
