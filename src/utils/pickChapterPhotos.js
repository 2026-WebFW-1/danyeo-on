import { findCoverIndex } from '@/utils/selectStopPhotos';

/**
 * 콜라주에 올릴 사진을 골라요. 글에 붙은 사진을 글 순서대로 먼저 고르고,
 * 남는 자리는 나머지 사진에서 시간 순서로 고르게 떨어진 것들로 채워요(처음 며칠에 몰리지 않게요).
 * 같은 입력이면 항상 같은 결과예요. 글에 붙었지만 이 지점 사진에 없는 id는 건너뛰어요.
 *
 * @param {import('@/types').PhotoRef[]} photos 지점의 사진(시간 순서)
 * @param {import('@/types').Post[]} posts 지점의 글(날짜순)
 * @param {number} max 고를 최대 개수
 * @returns {import('@/types').PhotoRef[]} 글에 붙은 사진, 그다음 나머지 사진 순서
 */
export function pickChapterPhotos(photos, posts, max) {
  if (max <= 0) return [];

  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  const attached = [];
  const attachedIds = new Set();
  for (const post of posts) {
    for (const id of post.photoIds) {
      const photo = photosById.get(id);
      if (photo && !attachedIds.has(id)) {
        attached.push(photo);
        attachedIds.add(id);
      }
    }
  }

  const picked = attached.slice(0, max);
  const rest = photos.filter((photo) => !attachedIds.has(photo.id));
  return [...picked, ...pickEvenly(rest, max - picked.length)];
}

// 줄 세운 것에서 count개를 같은 간격으로 골라요. 각 구간의 가운데를 집어서 맨 앞과 맨 끝에 치우치지 않아요.
function pickEvenly(items, count) {
  if (count <= 0) return [];
  if (count >= items.length) return items;

  return Array.from({ length: count }, (_, index) => {
    return items[Math.floor(((index + 0.5) * items.length) / count)];
  });
}

/**
 * hero 카드 위에 붙일 사진을 골라요. 그 글에 붙은 첫 사진이고, 없으면 지점의 대표 사진, 그것도 없으면 첫 사진이에요.
 * 사진이 하나도 없으면 null이라서 회색 칸으로 그려요.
 *
 * @param {import('@/types').Post} post
 * @param {import('@/types').PhotoRef[]} photos 지점의 사진
 * @param {string | null | undefined} coverFileKey 지점의 대표 사진
 * @returns {import('@/types').PhotoRef | null}
 */
export function pickHeroPhoto(post, photos, coverFileKey) {
  const attached = post.photoIds
    .map((id) => photos.find((photo) => photo.id === id))
    .find((photo) => photo !== undefined);

  return attached ?? photos[findCoverIndex(photos, coverFileKey)] ?? null;
}
