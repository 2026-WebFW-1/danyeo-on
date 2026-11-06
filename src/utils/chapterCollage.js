import { countPhotoSlots } from '@/utils/layoutCollage';
import { pickChapterPhotos, pickHeroPhoto } from '@/utils/pickChapterPhotos';

const hasTitle = (post) => post.title.trim() !== '';
const hasBody = (post) => post.body.trim() !== '';

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
 * @typedef {object} ChapterCollage
 * @property {{ post: import('@/types').Post, photo: import('@/types').PhotoRef | null } | null} hero
 *   사진이 위에 붙는 큰 카드. 챕터 첫날(제목이 있는 첫) 글이에요
 * @property {import('@/types').Post[]} cards hero를 뺀 글 카드(날짜순)
 * @property {import('@/types').Post[]} memoPosts 제목 없이 본문만 있는 짧은 글. 메모 카드로 그려요
 * @property {import('@/types').PhotoRef[]} photos 콜라주에 흩어 놓을 사진(hero 사진은 빼요)
 * @property {string[]} stickers 스티커 글자
 */

/**
 * 챕터 한 곳의 글·사진에서 콜라주에 무엇을 올릴지 골라요. 화면(ChapterView)과, 사진별 글을 읽을 사진을 알아야 하는
 * 페이지(ChapterPage)가 같은 결과를 보도록 한 곳에서 계산해요.
 *
 * @param {object} input
 * @param {Pick<import('@/types').Stop, 'coverFileKey'>} input.stop
 * @param {import('@/types').Post[]} input.posts 지점의 글(날짜순)
 * @param {import('@/types').PhotoRef[]} input.photos 지점의 사진(시간 순서)
 * @returns {ChapterCollage}
 */
export function selectChapterCollage({ stop, posts, photos }) {
  const [heroPost, ...cards] = posts.filter(hasTitle);
  const heroPhoto = heroPost ? pickHeroPhoto(heroPost, photos, stop.coverFileKey) : null;

  // 사진을 놓을 칸 수는 글 카드 수가 정해요(카드가 많으면 타일이 늘고, 마지막 타일이 덜 차면 칸도 덜 써요).
  const photoSlotCount = countPhotoSlots(cards.length, heroPost !== undefined);
  const freePhotos = photos.filter((photo) => photo.id !== heroPhoto?.id);

  return {
    hero: heroPost ? { post: heroPost, photo: heroPhoto } : null,
    cards,
    memoPosts: posts.filter((post) => !hasTitle(post) && hasBody(post)),
    photos: pickChapterPhotos(freePhotos, posts, photoSlotCount),
    stickers: pickStickerLabels(posts),
  };
}
