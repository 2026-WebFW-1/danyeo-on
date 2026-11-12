import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import seojinSeed from '@/data/seed/seojin.json';
import { pickHeroPhoto, pickStickerLabels, selectChapterCollage } from '@/utils/chapterCollage';
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
const range = (count, make, prefix) =>
  Array.from({ length: count }, (_, index) => make(`${prefix}${index}`));
const seedsFrom = (count) => Array.from({ length: count }, (_, index) => index + 1);

const SEED = 1234;

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

describe('pickHeroPhoto', () => {
  const photos = range(10, photo, 'p');

  test('그 글에 붙은 첫 사진을 줘요', () => {
    const attached = post('a', { photoIds: ['없는-사진', 'p3', 'p5'] });

    expect(pickHeroPhoto(attached, photos, null)).toEqual(photo('p3'));
  });

  test('붙은 사진이 없으면 지점의 대표 사진을 줘요', () => {
    expect(pickHeroPhoto(post('a'), photos, 'public:/photos/p4.webp')).toEqual(photo('p4'));
  });

  test('대표 사진도 목록에 없으면 첫 사진을 줘요', () => {
    expect(pickHeroPhoto(post('a'), photos, 'public:/photos/없음.webp')).toEqual(photo('p0'));
  });

  test('사진이 하나도 없으면 null이에요', () => {
    expect(pickHeroPhoto(post('a'), [], 'public:/photos/p4.webp')).toBeNull();
  });
});

describe('selectChapterCollage', () => {
  const stop = { coverFileKey: 'public:/photos/p2.webp' };
  const photos = range(8, photo, 'p');
  const select = (input) => selectChapterCollage({ stop, photos, seed: SEED, ...input });

  describe('hero와 글 카드', () => {
    test('제목 있는 글 중 하나가 hero고, 글 카드는 둘까지예요', () => {
      const posts = range(6, post, 'a');

      const { hero, cards } = select({ posts });

      expect(posts.map((item) => item.id)).toContain(hero.post.id);
      expect(cards).toHaveLength(2);
      expect(new Set([hero.post.id, ...ids(cards)]).size).toBe(3);
    });

    test('글이 칸(hero 하나와 글 카드 둘)보다 적으면 있는 만큼만 줘요', () => {
      const two = select({ posts: [post('a'), post('b')] });
      const one = select({ posts: [post('a')] });

      expect(two.hero).not.toBeNull();
      expect(two.cards).toHaveLength(1);
      expect(one.hero.post.id).toBe('a');
      expect(one.cards).toEqual([]);
    });

    test('같은 seed면 항상 같은 결과예요', () => {
      const posts = range(6, post, 'a');

      expect(select({ posts })).toEqual(select({ posts }));
    });

    test('seed가 다르면 다른 글이 hero가 될 수 있어요', () => {
      const posts = range(6, post, 'a');

      const heroes = new Set(seedsFrom(20).map((seed) => select({ posts, seed }).hero.post.id));

      expect(heroes.size).toBeGreaterThan(2);
    });

    test('제목이 없는 글은 hero도 글 카드도 되지 않아요', () => {
      const posts = [post('a'), post('b', { title: '  ', body: '짧은 메모' }), post('c')];

      const { hero, cards } = select({ posts });

      expect([hero.post.id, ...ids(cards)].toSorted()).toEqual(['a', 'c']);
    });

    test('제목 있는 글이 없으면 hero도 글 카드도 없어요', () => {
      const { hero, cards } = select({ posts: [post('a', { title: '' })] });

      expect(hero).toBeNull();
      expect(cards).toEqual([]);
    });
  });

  describe('hero 사진과 사진 칸', () => {
    test('hero 사진은 그 글에 붙은 사진이고, 사진 칸에서는 빠져요', () => {
      const { hero, photos: picked } = select({ posts: [post('a', { photoIds: ['p4'] })] });

      expect(hero.photo.id).toBe('p4');
      expect(ids(picked)).not.toContain('p4');
    });

    test('글에 사진이 안 붙었으면 hero 사진은 지점의 대표 사진이에요', () => {
      const { hero } = select({ posts: [post('a')] });

      expect(hero.photo.id).toBe('p2');
    });

    test('사진 칸은 다섯 장까지예요(사진이 많아도)', () => {
      const manyPhotos = range(30, photo, 'q');

      const { photos: picked } = select({ posts: [post('a')], photos: manyPhotos });

      expect(picked).toHaveLength(5);
      expect(new Set(ids(picked)).size).toBe(5);
    });

    test('사진이 다섯 장보다 적으면 있는 만큼만 줘요', () => {
      const { photos: picked } = select({ posts: [post('a')], photos: range(3, photo, 'q') });

      // hero 사진 한 장을 빼면 둘이 남아요
      expect(picked).toHaveLength(2);
    });

    test('seed가 다르면 다른 사진이 골라져요', () => {
      const manyPhotos = range(30, photo, 'q');

      const sets = new Set(
        seedsFrom(10).map((seed) =>
          ids(select({ posts: [], photos: manyPhotos, seed }).photos)
            .toSorted()
            .join(),
        ),
      );

      expect(sets.size).toBeGreaterThan(5);
    });

    test('글이 없으면 hero 없이 사진만 골라요', () => {
      const result = select({ posts: [] });

      expect(result.hero).toBeNull();
      expect(result.photos).toHaveLength(5);
    });

    test('사진이 하나도 없으면 hero 사진도 사진 칸도 없어요', () => {
      const { hero, photos: picked } = select({ posts: [post('a')], photos: [] });

      expect(hero.photo).toBeNull();
      expect(picked).toEqual([]);
    });
  });

  describe('메모 카드', () => {
    test('제목 없이 본문만 있는 글은 메모 글이고, 글 카드가 아니에요', () => {
      const posts = [post('a'), post('b', { title: '  ', body: '짧은 메모' })];

      const { memos, cards } = select({ posts });

      expect(memos).toEqual([{ id: 'b', text: '짧은 메모', date: '2025-01-01' }]);
      expect(cards).toEqual([]);
    });

    test('글에서 온 메모에는 그 글의 날짜가 붙어서, 눌러서 그 글을 고칠 수 있어요', () => {
      const posts = [
        post('a'),
        post('b', { title: '', body: '첫 메모', date: '2025-01-03' }),
        post('c', { title: '', body: '둘째 메모', date: '2025-01-05' }),
      ];

      const { memos } = select({ posts });

      expect(memos.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual([
        { id: 'b', text: '첫 메모', date: '2025-01-03' },
        { id: 'c', text: '둘째 메모', date: '2025-01-05' },
      ]);
    });

    test('제목도 본문도 없는 글은 어디에도 그리지 않아요', () => {
      const posts = [post('a'), post('b', { title: '', body: ' ' })];

      const { cards, memos } = select({ posts });

      expect(cards).toEqual([]);
      expect(memos).toEqual([]);
    });

    test('사진별 글도 메모 글이에요(날짜가 없어서 눌러 고치는 글은 아니에요)', () => {
      const { memos } = select({ posts: [post('a')], notes: { p1: '사진 한 장의 글' } });

      expect(memos).toEqual([{ id: 'note-p1', text: '사진 한 장의 글' }]);
      expect(memos[0]).not.toHaveProperty('date');
    });

    test('빈 사진별 글은 버려요', () => {
      expect(select({ posts: [post('a')], notes: { p1: '  ' } }).memos).toEqual([]);
    });

    test('메모 글이 많으면 둘만 골라요(제목 없는 글과 사진별 글을 가리지 않고 섞어서요)', () => {
      const posts = [
        post('a'),
        ...range(4, (id) => post(id, { title: '', body: `메모 ${id}` }), 'm'),
      ];
      const notes = Object.fromEntries(
        range(4, photo, 'q').map((item) => [item.id, `글 ${item.id}`]),
      );

      const { memos } = select({ posts, notes });

      expect(memos).toHaveLength(2);
      expect(new Set(ids(memos)).size).toBe(2);
    });

    test('메모 글이 없으면 메모 카드도 없어요', () => {
      expect(select({ posts: [post('a')] }).memos).toEqual([]);
    });
  });

  describe('스티커', () => {
    test('스티커는 넷까지이고, 글의 태그에서 서로 다른 것만 골라요', () => {
      const posts = [
        post('a', { tags: ['밴쿠버', '산책', '카페'] }),
        post('b', { tags: ['밴쿠버', '야경', '맛집', '쇼핑'] }),
      ];

      const { stickers } = select({ posts });

      expect(stickers).toHaveLength(4);
      expect(new Set(stickers).size).toBe(4);
      expect(stickers.every((label) => pickStickerLabels(posts).includes(label))).toBe(true);
    });

    test('태그가 넷보다 적으면 있는 만큼만 줘요', () => {
      expect(select({ posts: [post('a', { tags: ['산책'] })] }).stickers).toEqual(['산책']);
    });
  });

  describe('피그마 데모 데이터', () => {
    test('seojin 밴쿠버: 글 7개 중 hero 하나와 글 카드 둘, 스티커 셋(태그가 셋뿐이에요)', () => {
      const vancouver = seojin.stops.find((item) => item.chapter);
      const posts = selectPostsOfStop(seojin, seojinSeed.posts, vancouver.id);
      const stopPhotos = selectStopPhotos(vancouver, seojinSeed.photos);

      const result = selectChapterCollage({
        stop: vancouver,
        posts,
        photos: stopPhotos,
        seed: SEED,
      });

      expect(posts).toHaveLength(7);
      expect(result.cards).toHaveLength(2);
      expect(result.memos).toEqual([]);
      expect([...result.stickers].toSorted()).toEqual(['개스타운', '밴쿠버', '산책']);
      // 사진 6장 중 hero에 한 장을 쓰고 나머지 다섯이 사진 칸으로 가요
      expect(result.photos).toHaveLength(5);
    });

    test('edge 런던과 파리도 칸 수를 넘지 않아요', () => {
      const chapters = edge.stops.filter((item) => item.chapter);

      expect(chapters.map((item) => item.city)).toEqual(['런던', '파리']);
      chapters.forEach((chapter) => {
        const posts = selectPostsOfStop(edge, edgeSeed.posts, chapter.id);
        const result = selectChapterCollage({
          stop: chapter,
          posts,
          photos: selectStopPhotos(chapter, edgeSeed.photos),
          seed: SEED,
        });

        expect(result.cards.length).toBeLessThanOrEqual(2);
        expect(result.photos.length).toBeLessThanOrEqual(5);
        expect(result.hero).not.toBeNull();
      });
    });
  });
});
