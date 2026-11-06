import { describe, expect, test } from 'vitest';

import { COLLAGE_HEIGHT } from '@/constants/collage';
import { layoutCollage } from '@/utils/layoutCollage';

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

describe('layoutCollage', () => {
  test('아무것도 없으면 빈 목록이에요', () => {
    expect(layoutCollage({})).toEqual([]);
  });

  test('피그마 02의 한 장면은 피그마와 같은 자리에 놓여요', () => {
    const items = layoutCollage(SAMPLE);

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

  test('쌓이는 순서(z)가 작은 것부터 줘요', () => {
    const items = layoutCollage(SAMPLE);

    expect(items.map((item) => item.z)).toEqual(
      items.map((item) => item.z).toSorted((a, b) => a - b),
    );
  });

  test('모든 조각이 캔버스(높이 870) 안에 놓여요', () => {
    const items = layoutCollage(SAMPLE);

    expect(items.every((item) => item.y >= 0 && item.y < COLLAGE_HEIGHT)).toBe(true);
  });

  test('글 카드가 칸보다 많아도 아래로 이어 붙이지 않아요(칸은 둘뿐이에요)', () => {
    const items = layoutCollage({ ...SAMPLE, cards: range(6, post, 'c') });

    expect(byKind(items, 'card')).toHaveLength(2);
    expect(items.every((item) => item.y < COLLAGE_HEIGHT)).toBe(true);
  });

  test('칸보다 적게 주면 남는 칸은 비워 둬요', () => {
    const items = layoutCollage({
      hero: SAMPLE.hero,
      cards: [post('c0')],
      memos: [memo('m0')],
      photos: range(2, photo, 'p'),
      stickers: ['가'],
    });

    expect(items.map((item) => item.kind).toSorted()).toEqual([
      'card',
      'hero',
      'memo',
      'photo',
      'photo',
      'sticker',
    ]);
    // 칸은 위에서부터 채워요
    expect(byKind(items, 'card')[0]).toMatchObject({ x: 200, y: 240 });
  });

  test('hero가 없어도 글 카드는 같은 칸에 놓여요(hero 칸은 비어요)', () => {
    const items = layoutCollage({ cards: range(2, post, 'c') });

    expect(byKind(items, 'hero')).toEqual([]);
    expect(byKind(items, 'card').map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 200, y: 240 },
      { x: 720, y: 570 },
    ]);
  });

  test('칸보다 많은 사진·메모·스티커는 그리지 않아요', () => {
    const items = layoutCollage({
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
    const items = layoutCollage({ photos: range(3, photo, 'p') });

    expect(items.map((item) => item.kind)).toEqual(['photo', 'photo', 'photo']);
  });

  test('글만 있어도 글 카드와 hero를 놓아요', () => {
    const items = layoutCollage({ hero: { post: post('h'), photo: null }, cards: [post('c')] });

    expect(items.map((item) => item.kind).toSorted()).toEqual(['card', 'hero']);
    expect(items.find((item) => item.kind === 'hero').photo).toBeNull();
  });

  test('긴 스티커 글자는 줄임표로 잘라요', () => {
    const items = layoutCollage({ stickers: ['가나다라마바사아자차카타파하가나다라마바'] });

    expect(items[0].label).toBe('가나다라마바사아자차카타파하가나다…');
  });

  test('피그마 샘플의 가장 긴 스티커(17자)는 자르지 않아요', () => {
    const items = layoutCollage({ stickers: ['한 달에 한 번 비 안 오는 날'] });

    expect(items[0].label).toBe('한 달에 한 번 비 안 오는 날');
  });

  test('같은 입력이면 항상 같은 배치예요', () => {
    expect(layoutCollage(SAMPLE)).toEqual(layoutCollage(SAMPLE));
  });

  test('key가 서로 달라요', () => {
    const keys = layoutCollage(SAMPLE).map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
