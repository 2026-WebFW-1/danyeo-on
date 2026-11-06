import { describe, expect, test } from 'vitest';

import { pickChapterPhotos, pickHeroPhoto } from '@/utils/pickChapterPhotos';

const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });
const post = (id, photoIds = []) => ({
  id,
  date: '2025-01-01',
  title: '제목',
  body: '본문',
  tags: [],
  photoIds,
});

const photos = Array.from({ length: 10 }, (_, index) => photo(`p${index}`));
const ids = (list) => list.map((item) => item.id);

describe('pickChapterPhotos', () => {
  test('글에 붙은 사진을 글 순서대로 먼저 골라요', () => {
    const posts = [post('a', ['p5']), post('b', ['p2', 'p7'])];

    expect(ids(pickChapterPhotos(photos, posts, 3))).toEqual(['p5', 'p2', 'p7']);
  });

  test('남는 자리는 나머지 사진에서 같은 간격으로 골라요', () => {
    const posts = [post('a', ['p5'])];

    // 글에 붙은 p5 뒤에, 나머지 아홉 장(p5만 빠진 p0부터 p9)에서 같은 간격으로 넷
    expect(ids(pickChapterPhotos(photos, posts, 5))).toEqual(['p5', 'p1', 'p3', 'p6', 'p8']);
  });

  test('글이 없으면 전체에서 시간 순서로 고르게 골라요', () => {
    expect(ids(pickChapterPhotos(photos, [], 5))).toEqual(['p1', 'p3', 'p5', 'p7', 'p9']);
  });

  test('사진이 최대 개수보다 적으면 모두 순서대로 줘요', () => {
    expect(ids(pickChapterPhotos(photos.slice(0, 3), [], 8))).toEqual(['p0', 'p1', 'p2']);
  });

  test('글에 붙은 사진이 최대 개수보다 많으면 글 순서대로 최대 개수까지만 줘요', () => {
    const posts = [post('a', ['p9', 'p8']), post('b', ['p7'])];

    expect(ids(pickChapterPhotos(photos, posts, 2))).toEqual(['p9', 'p8']);
  });

  test('같은 사진이 두 글에 붙어도 한 번만 줘요', () => {
    const posts = [post('a', ['p3']), post('b', ['p3', 'p4'])];

    expect(ids(pickChapterPhotos(photos, posts, 3))).toEqual(['p3', 'p4', 'p6']);
  });

  test('이 지점 사진에 없는 id는 건너뛰어요', () => {
    const posts = [post('a', ['없는-사진', 'p2'])];

    expect(ids(pickChapterPhotos(photos, posts, 2))).toEqual(['p2', 'p5']);
  });

  test('최대 개수가 0이거나 사진이 없으면 빈 목록이에요', () => {
    expect(pickChapterPhotos(photos, [], 0)).toEqual([]);
    expect(pickChapterPhotos([], [post('a', ['p1'])], 5)).toEqual([]);
  });

  test('같은 입력이면 항상 같은 결과예요', () => {
    const posts = [post('a', ['p6'])];

    expect(pickChapterPhotos(photos, posts, 4)).toEqual(pickChapterPhotos(photos, posts, 4));
  });
});

describe('pickHeroPhoto', () => {
  test('그 글에 붙은 첫 사진을 줘요', () => {
    expect(pickHeroPhoto(post('a', ['없는-사진', 'p3', 'p5']), photos, null)).toEqual(photo('p3'));
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
