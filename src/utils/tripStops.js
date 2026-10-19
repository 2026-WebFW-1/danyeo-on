/**
 * 지점으로 들어오는 이동 구간이에요. 03 도시 블록 위의 "서울에서 · 3,717km" 한 줄에 쓰는 값이에요.
 *
 * @typedef {object} StopInbound
 * @property {string} fromName 어디서 오는지. 집에서 오면 집의 도시 이름, 아니면 앞 지점의 도시 이름
 * @property {number} km
 * @property {'flight' | 'train' | 'car'} mode
 */

/**
 * 03 도시 블록 하나에 쓰는 지점이에요. days·photoCount·coverFileKey 같은 값은 stop에서 그대로 써요.
 *
 * @typedef {object} TripStopItem
 * @property {import('@/types').Stop} stop
 * @property {StopInbound | null} inbound 들어오는 구간이 없으면 null
 */

/**
 * 글 중에서 이 파일이 읽는 값만 적었어요. 전체 모양은 src/data/README.md의 seed `posts`예요.
 *
 * @typedef {{ date: string, title: string, body: string }} PostLike
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 시간대가 붙은 시각('2024-07-16T10:00:00+09:00')에서 현지 날짜(앞 10글자)만 남겨요.
 * Date로 바꾸면 브라우저 시간대에 따라 날짜가 밀릴 수 있어서 문자열로 다뤄요.
 *
 * @param {string} iso
 * @returns {string} 예: '2024-07-16'
 */
function toLocalDate(iso) {
  return iso.slice(0, 10);
}

/**
 * 현지 날짜를 UTC 자정의 밀리초로 바꿔요. UTC는 서머타임이 없어서 하루가 항상 24시간이에요.
 *
 * @param {string} iso
 * @returns {number}
 */
function toUtcDay(iso) {
  const [year, month, day] = toLocalDate(iso).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * 한 여행의 지점을 시간 순서대로 돌려줘요. 경유 지점은 줄을 만들지 않아서 빠져요.
 * 없는 여행이면 빈 배열이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @returns {TripStopItem[]}
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
        leg && (leg.from === 'home' ? journey.home?.city : stopsById.get(leg.from)?.city);

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

  return (toUtcDay(next.from) - toUtcDay(journey.trips[index].to)) / MS_PER_DAY;
}

/**
 * 한 지점에 속한 글을 날짜순으로 돌려줘요.
 * 글은 지점이 아니라 날짜에 붙어서, 같은 날을 두 지점이 나눠 가지면 먼저 오는 지점에만 붙여요.
 * 경유 지점은 줄이 없어서 글도 받지 않아요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {PostLike[] | null | undefined} posts
 * @param {string} stopId
 * @returns {PostLike[]}
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
 * @param {PostLike[] | null | undefined} posts selectPostsOfStop의 결과
 * @returns {string | null}
 */
export function getOneLiner(posts) {
  const first = posts?.[0];
  if (!first) return null;

  return [first.body, first.title].find((text) => text?.trim()) ?? null;
}
