import { formatNo } from '@/utils/formatNo';

/**
 * 챕터 지점인지 알려줘요. 경유 지점은 챕터가 될 수 없어서 같이 걸러요.
 *
 * @param {import('@/types').Stop} stop
 * @returns {boolean}
 */
function isChapterStop(stop) {
  return stop.chapter && !stop.transit;
}

/**
 * 챕터 목록을 시간 순서대로 돌려줘요. 챕터가 없거나 journey가 없으면 빈 배열이에요.
 * journey.stops는 시간 순서로 들어 있어서 그 순서를 그대로 써요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {import('@/types').ChapterItem[]}
 */
export function selectChapters(journey) {
  if (!journey) return [];

  const chapters = journey.stops.filter(isChapterStop);
  const total = formatNo(chapters.length);

  return chapters.map((stop, index) => ({
    stop,
    no: formatNo(index + 1),
    total,
  }));
}

/**
 * 주소(slug)로 챕터 지점을 찾아요. 없는 주소거나 챕터가 아닌 지점이면 null이에요.
 * slug는 데이터 값 그대로 한글(`밴쿠버-2025`)이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string | null | undefined} slug
 * @returns {import('@/types').Stop | null}
 */
export function findChapterBySlug(journey, slug) {
  return journey?.stops.find((stop) => isChapterStop(stop) && stop.slug === slug) ?? null;
}

/**
 * 같은 여행 안에서 시간순으로 다음인 지점을 돌려줘요(경유 지점은 건너뛰어요).
 * 여행의 마지막 지점이면 다음 여행으로 넘어가지 않고 null이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} stopId 지금 보는 지점의 ID
 * @returns {import('@/types').Stop | null}
 */
export function getNextStop(journey, stopId) {
  const stop = journey?.stops.find((s) => s.id === stopId);
  const trip = stop && journey.trips.find((t) => t.id === stop.tripId);
  if (!trip) return null;

  // trip.stopIds가 그 여행의 지점을 시간 순서로 가지고 있어요.
  const index = trip.stopIds.indexOf(stop.id);
  if (index === -1) return null;

  const stopsById = new Map(journey.stops.map((s) => [s.id, s]));
  const next = trip.stopIds
    .slice(index + 1)
    .map((id) => stopsById.get(id))
    .find((s) => s && !s.transit);

  return next ?? null;
}
