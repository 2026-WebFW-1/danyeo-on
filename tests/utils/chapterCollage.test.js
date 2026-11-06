import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import seojinSeed from '@/data/seed/seojin.json';
import { pickStickerLabels, selectChapterCollage } from '@/utils/chapterCollage';
import { selectStopPhotos } from '@/utils/selectStopPhotos';
import { selectPostsOfStop } from '@/utils/tripStops';

const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });
const post = (id, overrides = {}) => ({
  id,
  date: '2025-01-01',
  title: `제목 ${id}`,
  body: `본문 ${id}`,
  tags: [],
  photoIds: [],
  ...overrides,
});
const ids = (list) => list.map((item) => item.id);

describe('pickStickerLabels', () => {
  test('태그를 처음 나온 순서대로 모으고 같은 태그는 한 번만 둬요', () => {
    const posts = [
      post('a', { tags: ['밴쿠버', '산책'] }),
      post('b', { tags: ['밴쿠버', '카페'] }),
    ];

    expect(pickStickerLabels(posts)).toEqual(['밴쿠버', '산책', '카페']);
  });

  test('앞뒤 공백을 지우고 빈 태그는 버려요', () => {
    expect(pickStickerLabels([post('a', { tags: [' 산책 ', '', '  '] })])).toEqual(['산책']);
  });

  test('태그가 없으면 빈 목록이에요', () => {
    expect(pickStickerLabels([post('a')])).toEqual([]);
    expect(pickStickerLabels([])).toEqual([]);
  });
});

describe('selectChapterCollage', () => {
  const stop = { coverFileKey: 'public:/photos/p2.webp' };
  const photos = Array.from({ length: 8 }, (_, index) => photo(`p${index}`));

  test('제목이 있는 첫 글이 hero고 나머지는 글 카드예요', () => {
    const posts = [post('a'), post('b'), post('c')];

    const { hero, cards } = selectChapterCollage({ stop, posts, photos });

    expect(hero.post.id).toBe('a');
    expect(ids(cards)).toEqual(['b', 'c']);
  });

  test('hero 사진은 그 글에 붙은 사진이고, 콜라주 사진에서는 빠져요', () => {
    const posts = [post('a', { photoIds: ['p4'] })];

    const { hero, photos: picked } = selectChapterCollage({ stop, posts, photos });

    expect(hero.photo.id).toBe('p4');
    expect(ids(picked)).not.toContain('p4');
  });

  test('글에 사진이 안 붙었으면 hero 사진은 지점의 대표 사진이에요', () => {
    const { hero } = selectChapterCollage({ stop, posts: [post('a')], photos });

    expect(hero.photo.id).toBe('p2');
  });

  test('제목 없이 본문만 있는 글은 메모 카드 글이고, 글 카드가 아니에요', () => {
    const posts = [post('a'), post('b', { title: '  ', body: '짧은 메모' }), post('c')];

    const { cards, memoPosts } = selectChapterCollage({ stop, posts, photos });

    expect(ids(cards)).toEqual(['c']);
    expect(ids(memoPosts)).toEqual(['b']);
  });

  test('제목도 본문도 없는 글은 어디에도 그리지 않아요', () => {
    const posts = [post('a'), post('b', { title: '', body: ' ' })];

    const { cards, memoPosts } = selectChapterCollage({ stop, posts, photos });

    expect(cards).toEqual([]);
    expect(memoPosts).toEqual([]);
  });

  test('제목 있는 글이 없으면 hero가 없어요', () => {
    const { hero, cards } = selectChapterCollage({
      stop,
      posts: [post('a', { title: '' })],
      photos,
    });

    expect(hero).toBeNull();
    expect(cards).toEqual([]);
  });

  test('글이 없으면 사진만 골라요', () => {
    const result = selectChapterCollage({ stop, posts: [], photos });

    expect(result.hero).toBeNull();
    expect(result.photos).toHaveLength(5);
  });

  test('콜라주 사진 수는 글 카드가 늘어 타일이 늘면 같이 늘어요', () => {
    const manyPhotos = Array.from({ length: 30 }, (_, index) => photo(`q${index}`));
    const postsOf = (count) => Array.from({ length: count }, (_, index) => post(`a${index}`));
    const countPhotos = (count) =>
      selectChapterCollage({ stop, posts: postsOf(count), photos: manyPhotos }).photos.length;

    // 글 3개(hero와 카드 둘)면 타일 하나라 사진 칸이 5개예요
    expect(countPhotos(3)).toBe(5);
    // 글 7개면 타일 둘이 꽉 차서 10개예요
    expect(countPhotos(7)).toBe(10);
    // 글 4개면 둘째 타일에 카드가 한 장뿐이라 그 타일은 사진 칸을 2개만 써요
    expect(countPhotos(4)).toBe(7);
  });

  test('사진이 하나도 없으면 hero 사진도 콜라주 사진도 없어요', () => {
    const { hero, photos: picked } = selectChapterCollage({ stop, posts: [post('a')], photos: [] });

    expect(hero.photo).toBeNull();
    expect(picked).toEqual([]);
  });

  test('seojin 밴쿠버: 글 7개를 hero 하나와 글 카드 여섯으로 나누고, 스티커는 서로 다른 태그 셋이에요', () => {
    const vancouver = seojin.stops.find((item) => item.chapter);
    const posts = selectPostsOfStop(seojin, seojinSeed.posts, vancouver.id);
    const stopPhotos = selectStopPhotos(vancouver, seojinSeed.photos);

    const result = selectChapterCollage({ stop: vancouver, posts, photos: stopPhotos });

    expect(result.hero.post.date).toBe(posts[0].date);
    expect(result.cards).toHaveLength(6);
    expect(result.memoPosts).toEqual([]);
    expect(result.stickers).toEqual(['밴쿠버', '개스타운', '산책']);
    // 사진 6장 중 hero에 한 장을 쓰고 나머지가 콜라주로 가요
    expect(result.photos.length + 1).toBe(stopPhotos.length);
  });

  test('edge 런던과 파리의 글도 모두 hero와 글 카드로 나뉘어요', () => {
    const chapters = edge.stops.filter((item) => item.chapter);

    expect(chapters.map((item) => item.city)).toEqual(['런던', '파리']);
    chapters.forEach((chapter) => {
      const posts = selectPostsOfStop(edge, edgeSeed.posts, chapter.id);
      const result = selectChapterCollage({
        stop: chapter,
        posts,
        photos: selectStopPhotos(chapter, edgeSeed.photos),
      });

      expect(1 + result.cards.length).toBe(posts.length);
    });
  });
});
