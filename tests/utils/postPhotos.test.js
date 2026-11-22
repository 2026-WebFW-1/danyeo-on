import { describe, expect, test } from 'vitest';

import { initialSelection, movePhoto } from '@/utils/postPhotos';

const DAY_IDS = ['a', 'b'];

describe('initialSelection', () => {
  test('글이 없으면 그날 사진 전부예요', () => {
    expect(initialSelection(undefined, DAY_IDS)).toEqual(['a', 'b']);
  });

  test('글의 사진이 비었으면 그날 사진 전부예요', () => {
    expect(initialSelection({ photoIds: [] }, DAY_IDS)).toEqual(['a', 'b']);
  });

  test('글에 사진이 있으면 그것만 골라요', () => {
    expect(initialSelection({ photoIds: ['b'] }, DAY_IDS)).toEqual(['b']);
  });

  test('그날 사진이 아닌 ID는 빼고, 글의 순서를 지켜요', () => {
    expect(initialSelection({ photoIds: ['gone', 'b', 'a'] }, DAY_IDS)).toEqual(['b', 'a']);
  });

  test('남는 사진이 없으면 그날 사진 전부예요', () => {
    expect(initialSelection({ photoIds: ['gone'] }, DAY_IDS)).toEqual(['a', 'b']);
  });

  test('돌려준 목록을 바꿔도 그날 사진 목록은 그대로예요', () => {
    const dayIds = ['a', 'b'];

    initialSelection(undefined, dayIds).push('c');

    expect(dayIds).toEqual(['a', 'b']);
  });
});

describe('movePhoto', () => {
  test('뒤의 사진을 앞으로 옮기고, 원본은 그대로예요', () => {
    const ids = ['a', 'b', 'c'];

    expect(movePhoto(ids, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  test('앞의 사진을 한 칸 뒤로 옮겨요', () => {
    expect(movePhoto(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
});
