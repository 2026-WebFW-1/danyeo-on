import { describe, expect, test } from 'vitest';

import { countPhotoSlots, layoutCollage } from '@/utils/layoutCollage';

const post = (id) => ({
  id,
  date: '2025-01-01',
  title: '제목',
  body: '본문',
  tags: [],
  photoIds: [],
});
const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });
const memo = (id) => ({ id, text: `메모 ${id}` });

const range = (count, make, prefix) =>
  Array.from({ length: count }, (_, index) => make(`${prefix}${index}`));
const byKind = (items, kind) => items.filter((item) => item.kind === kind);

// 피그마 02의 한 장면: hero 하나, 글 카드 둘, 메모 둘, 사진 다섯, 스티커 넷
const SAMPLE = {
  hero: { post: post('h'), photo: photo('hp') },
  cards: range(2, post, 'c'),
  memos: range(2, memo, 'm'),
  photos: range(5, photo, 'p'),
  stickers: ['가', '나', '다', '라'],
};

describe('countPhotoSlots', () => {
  test.each([
    [0, true, 5],
    [2, true, 5],
    // 이어 붙인 타일은 글 카드가 찬 만큼만 사진 칸을 써요(1/4 → 2, 2/4 → 3, 3/4 → 4, 4/4 → 5)
    [3, true, 7],
    [4, true, 8],
    [5, true, 9],
    [6, true, 10],
    [7, true, 12],
    [4, false, 5],
    [5, false, 7],
  ])('글 카드 %i개, hero %s이면 사진 칸이 %i개예요', (cardCount, hasHero, expected) => {
    expect(countPhotoSlots(cardCount, hasHero)).toBe(expected);
  });
});

describe('layoutCollage', () => {
  test('아무것도 없으면 빈 캔버스예요', () => {
    expect(layoutCollage({})).toEqual({ items: [], height: 128, continueTop: 24 });
  });

  test('피그마 02의 한 장면은 피그마와 같은 자리에 놓여요', () => {
    const { items } = layoutCollage(SAMPLE);

    expect(items).toHaveLength(14);
    expect(byKind(items, 'hero')[0]).toMatchObject({ x: 690, y: 0, width: 402, height: 412, z: 9 });
    expect(byKind(items, 'card').map(({ x, y, width }) => ({ x, y, width }))).toEqual([
      { x: 200, y: 240, width: 380 },
      { x: 720, y: 570, width: 360 },
    ]);
    expect(byKind(items, 'photo')[0]).toMatchObject({
      x: 522.8,
      y: 117.3,
      width: 200,
      height: 220,
      rotate: -1.5,
    });
    expect(byKind(items, 'sticker').find((item) => item.label === '가')).toMatchObject({
      x: 209.6,
      y: 102.2,
      size: 'large',
    });
    expect(byKind(items, 'memo')[0]).toMatchObject({ x: 1007.8, rotate: 1.5, text: '메모 m0' });
  });

  test('한 타일이 꽉 차면 캔버스 높이와 [계속 여행하기] 줄 자리가 피그마와 같아요(871과 766)', () => {
    const { height, continueTop } = layoutCollage(SAMPLE);

    // 피그마 프레임은 1000(Nav 아래)이고 콜라주 위쪽 130을 빼면 870이에요. 맨 아래 사진 끝(838.6)을 올림해서 1 크요
    expect(height).toBe(871);
    expect(continueTop).toBe(766);
  });

  test('쌓이는 순서(z)가 작은 것부터 줘요', () => {
    const { items } = layoutCollage(SAMPLE);

    expect(items.map((item) => item.z)).toEqual(
      items.map((item) => item.z).toSorted((a, b) => a - b),
    );
  });

  test('글 카드가 칸보다 많으면 같은 타일을 아래로 이어 붙여요', () => {
    const { items, height, continueTop } = layoutCollage({ ...SAMPLE, cards: range(3, post, 'c') });

    const third = byKind(items, 'card').find((item) => item.post.id === 'c2');
    expect(third).toMatchObject({ x: 690, y: 828, width: 402, z: 29 });
    // 둘째 타일에는 글 카드만 있어서, 가장 큰 카드(242)의 아래 1070에 맞춰 닫혀요.
    // 카드가 줄 자리(오른쪽 끝 1082) 위에 걸려서 줄은 카드 아래 24px이에요
    expect(height).toBe(1198);
    expect(continueTop).toBe(1094);
  });

  test('이어 붙인 타일이 덜 찼으면 사진·메모·스티커도 찬 만큼만 놓아요', () => {
    const { items } = layoutCollage({
      hero: SAMPLE.hero,
      cards: range(3, post, 'c'),
      memos: range(6, memo, 'm'),
      photos: range(12, photo, 'p'),
      stickers: range(8, (id) => id, 's'),
    });

    // 첫 타일은 다 채우고(5·2·4), 카드가 한 장뿐인 둘째 타일은 4분의 1만큼(2·1·1)이에요
    expect(byKind(items, 'photo')).toHaveLength(7);
    expect(byKind(items, 'memo')).toHaveLength(3);
    expect(byKind(items, 'sticker')).toHaveLength(5);
  });

  test('첫 타일은 글 카드가 적어도 사진·메모·스티커 칸을 다 써요', () => {
    const { items } = layoutCollage({
      hero: SAMPLE.hero,
      memos: range(4, memo, 'm'),
      photos: range(9, photo, 'p'),
      stickers: range(6, (id) => id, 's'),
    });

    expect(byKind(items, 'photo')).toHaveLength(5);
    expect(byKind(items, 'memo')).toHaveLength(2);
    expect(byKind(items, 'sticker')).toHaveLength(4);
  });

  test('덜 찬 마지막 타일은 아래를 비우지 않고, 줄은 오른쪽 사진 아래로 내려가요', () => {
    const { items, height, continueTop } = layoutCollage({
      hero: SAMPLE.hero,
      cards: range(3, post, 'c'),
      memos: range(6, memo, 'm'),
      photos: range(12, photo, 'p'),
      stickers: range(8, (id) => id, 's'),
    });

    // 둘째 타일이 꽉 찼다면 828 + 871 = 1699쯤이에요. 둘째 타일의 오른쪽 사진(y 828 + 166.3, 높이 250에 기울기)이
    // 1247.9까지 내려오고, 줄은 그 아래 24px(1272)부터예요
    const rightPhoto = byKind(items, 'photo').find((item) => item.x === 1214.3 && item.y > 800);
    expect(rightPhoto).toBeDefined();
    expect(continueTop).toBe(1272);
    expect(height).toBe(1376);
  });

  test('hero가 없으면 첫 타일에도 글 카드 칸 넷을 써요', () => {
    const { items } = layoutCollage({ cards: range(4, post, 'c') });

    const positionOf = (id) => {
      const { x, y } = byKind(items, 'card').find((item) => item.post.id === id);
      return { x, y };
    };

    expect(positionOf('c0')).toEqual({ x: 690, y: 0 });
    expect(positionOf('c1')).toEqual({ x: 200, y: 240 });
    expect(positionOf('c2')).toEqual({ x: 720, y: 570 });
    expect(positionOf('c3')).toEqual({ x: 700, y: 268 });
    // 글 카드만 있어서 가장 큰 카드(570 + 242 = 812)의 아래에 맞춰 닫혀요
    expect(layoutCollage({ cards: range(4, post, 'c') }).height).toBe(844);
  });

  test('칸보다 많은 사진·메모·스티커는 그리지 않아요', () => {
    const { items } = layoutCollage({
      hero: SAMPLE.hero,
      photos: range(9, photo, 'p'),
      memos: range(5, memo, 'm'),
      stickers: ['1', '2', '3', '4', '5', '6'],
    });

    expect(byKind(items, 'photo')).toHaveLength(5);
    expect(byKind(items, 'memo')).toHaveLength(2);
    expect(byKind(items, 'sticker')).toHaveLength(4);
  });

  test('사진만 있어도 사진 칸에 놓아요', () => {
    const { items } = layoutCollage({ photos: range(3, photo, 'p') });

    expect(items.map((item) => item.kind)).toEqual(['photo', 'photo', 'photo']);
  });

  test('글만 있어도 글 카드와 hero를 놓아요', () => {
    const { items } = layoutCollage({ hero: { post: post('h'), photo: null }, cards: [post('c')] });

    expect(items.map((item) => item.kind).toSorted()).toEqual(['card', 'hero']);
    expect(items.find((item) => item.kind === 'hero').photo).toBeNull();
  });

  test('긴 스티커 글자는 줄임표로 잘라요', () => {
    const { items } = layoutCollage({ stickers: ['가나다라마바사아자차카타파하가나다라마바'] });

    expect(items[0].label).toBe('가나다라마바사아자차카타파하가나다…');
  });

  test('피그마 샘플의 가장 긴 스티커(17자)는 자르지 않아요', () => {
    const { items } = layoutCollage({ stickers: ['한 달에 한 번 비 안 오는 날'] });

    expect(items[0].label).toBe('한 달에 한 번 비 안 오는 날');
  });

  test('같은 입력이면 항상 같은 배치예요', () => {
    expect(layoutCollage(SAMPLE)).toEqual(layoutCollage(SAMPLE));
  });

  test('key가 서로 달라요', () => {
    const { items } = layoutCollage({ ...SAMPLE, cards: range(6, post, 'c') });
    const keys = items.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
