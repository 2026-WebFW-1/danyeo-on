import { CARD_SLOTS, MEMO_SLOTS, PHOTO_SLOTS, STICKER_SLOTS } from '@/constants/collage';
import { pickBySeed, sortBySeed } from '@/utils/seededPick';
import { findCoverIndex } from '@/utils/selectStopPhotos';

const hasTitle = (post) => post.title.trim() !== '';
const hasBody = (post) => post.body.trim() !== '';
const getId = (item) => item.id;
const getLabel = (label) => label;

/**
 * 스티커로 그릴 글자를 골라요. 글의 태그를 처음 나온 순서대로 모으고, 같은 태그는 한 번만 둬요.
 * 한 도시의 글에는 같은 태그(예: 도시 이름)가 여러 번 붙어서, 그대로 그리면 같은 스티커가 반복돼요.
 *
 * @param {import('@/types').Post[]} posts
 * @returns {string[]}
 */
export function pickStickerLabels(posts) {
  const labels = posts.flatMap((post) => post.tags.map((tag) => tag.trim())).filter(Boolean);
  return [...new Set(labels)];
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

/**
 * @typedef {object} ChapterCollage
 * @property {{ post: import('@/types').Post, photo: import('@/types').PhotoRef | null } | null} hero
 *   사진이 위에 붙는 큰 카드
 * @property {import('@/types').Post[]} cards 글 카드 칸(둘)에 들어갈 글
 * @property {{ id: string, text: string }[]} memos 메모 카드 칸(둘)에 들어갈 글
 * @property {import('@/types').PhotoRef[]} photos 사진 칸(다섯)에 들어갈 사진(hero 사진은 빼요)
 * @property {string[]} stickers 스티커 칸(넷)에 들어갈 글자
 */

/**
 * 챕터 한 곳의 글·사진에서 콜라주의 칸마다 무엇을 넣을지 골라요.
 * 칸은 피그마 02의 한 장면으로 정해져 있어요(hero 1 · 글 카드 2 · 메모 2 · 사진 5 · 스티커 4). 글·사진이 칸보다 많으면
 * seed로 무작위로 고르고(seededPick), 적으면 있는 만큼만 줘요. 같은 seed면 항상 같은 결과예요.
 *
 *  - hero와 글 카드: 제목이 있는 글에서 골라요. 섞은 순서의 첫 글이 hero이고 다음 둘이 글 카드예요.
 *  - 메모 카드: 제목 없이 본문만 있는 글과 사진별 글(notes)에서 골라요.
 *  - 사진: 지점의 사진에서 골라요. hero 사진은 그 글에 붙은 사진(pickHeroPhoto)이라 빼고 골라요.
 *  - 스티커: 글의 태그에서 골라요. 같은 태그는 한 번만 둬요.
 *
 * @param {object} input
 * @param {Pick<import('@/types').Stop, 'coverFileKey'>} input.stop
 * @param {import('@/types').Post[]} input.posts 지점의 글
 * @param {import('@/types').PhotoRef[]} input.photos 지점의 사진
 * @param {Record<string, string>} [input.notes] 사진 id → 사진별 글 본문
 * @param {number} input.seed 무작위로 고르는 기준(createSeed). 같은 값이면 같은 모양이에요
 * @returns {ChapterCollage}
 */
export function selectChapterCollage({ stop, posts, photos, notes = {}, seed }) {
  const [heroPost, ...otherTitled] = sortBySeed(posts.filter(hasTitle), seed, getId);
  const heroPhoto = heroPost ? pickHeroPhoto(heroPost, photos, stop.coverFileKey) : null;

  const postMemos = posts
    .filter((post) => !hasTitle(post) && hasBody(post))
    .map((post) => ({ id: post.id, text: post.body }));
  const photoMemos = Object.entries(notes)
    .filter(([, text]) => text.trim() !== '')
    .map(([photoId, text]) => ({ id: `note-${photoId}`, text }));

  return {
    hero: heroPost ? { post: heroPost, photo: heroPhoto } : null,
    cards: otherTitled.slice(0, CARD_SLOTS.length),
    memos: pickBySeed([...postMemos, ...photoMemos], MEMO_SLOTS.length, seed, getId),
    photos: pickBySeed(
      photos.filter((photo) => photo.id !== heroPhoto?.id),
      PHOTO_SLOTS.length,
      seed,
      getId,
    ),
    stickers: pickBySeed(pickStickerLabels(posts), STICKER_SLOTS.length, seed, getLabel),
  };
}
