import { HOME_ID } from '@/constants/journey';
import { calcDaysBetween, toLocalDate } from '@/utils/localDate';

/**
 * 한 여행의 지점을 시간 순서대로 돌려줘요. 경유 지점은 줄을 만들지 않아서 빠져요.
 * 없는 여행이면 빈 배열이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {import('@/types').TripStopItem[]}
 */
export function selectTripStops(journey, tripId) {
  const trip = journey?.trips.find((t) => t.id === tripId);
  if (!trip) return [];

  const stopsById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  // 집을 안 들르는 구간(gap)은 tripId가 null이라 여행이 아니라 도착 지점으로 찾아요.
  const legsByTo = new Map(journey.legs.map((leg) => [leg.to, leg]));

  return trip.stopIds
    .map((id) => stopsById.get(id))
    .filter((stop) => stop && !stop.transit)
    .map((stop) => {
      const leg = legsByTo.get(stop.id);
      const fromName =
        leg && (leg.from === HOME_ID ? journey.home?.city : stopsById.get(leg.from)?.city);

      return {
        stop,
        inbound: fromName ? { fromName, km: leg.km, mode: leg.mode } : null,
      };
    });
}

/**
 * 이 여행이 끝나고 다음 여행이 시작할 때까지 며칠인지 돌려줘요(03 맨 아래 "186일 뒤").
 * 다음 여행이 없거나 없는 여행이면 null이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {number | null}
 */
export function getDaysBetweenTrips(journey, tripId) {
  const index = journey?.trips.findIndex((t) => t.id === tripId) ?? -1;
  const next = journey?.trips[index + 1];
  if (index === -1 || !next) return null;

  return calcDaysBetween(journey.trips[index].to, next.from);
}

/**
 * 한 지점에 속한 글을 날짜순으로 돌려줘요.
 * 글은 지점이 아니라 날짜에 붙어서, 같은 날을 두 지점이 나눠 가지면 먼저 오는 지점에만 붙여요.
 * 경유 지점은 줄이 없어서 글도 받지 않아요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Post[] | null | undefined} posts
 * @param {string} stopId
 * @returns {import('@/types').Post[]}
 */
export function selectPostsOfStop(journey, posts, stopId) {
  if (!journey || !posts) return [];

  // journey.stops는 시간 순서라서, 날짜를 처음 품은 지점이 그 날짜의 주인이에요.
  const stops = journey.stops.filter((stop) => !stop.transit);
  const ownerOf = (date) =>
    stops.find((stop) => toLocalDate(stop.from) <= date && date <= toLocalDate(stop.to));

  return posts
    .filter((post) => ownerOf(post.date)?.id === stopId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 03 도시 블록에 보여 줄 한 줄 글을 골라요. 첫 글의 본문이고, 본문이 비면 제목이에요.
 * 글을 자르지 않아요. 줄 수 제한은 컴포넌트가 CSS(line-clamp)로 해요.
 * 글이 없으면 null이라서, 그 지점은 줄을 숨기면 돼요.
 *
 * @param {import('@/types').Post[] | null | undefined} posts selectPostsOfStop의 결과
 * @returns {string | null}
 */
export function getOneLiner(posts) {
  const first = posts?.[0];
  if (!first) return null;

  return [first.body, first.title].find((text) => text?.trim()) ?? null;
}
