import { describe, expect, test } from 'vitest';

import { getNextIndex, getPrevIndex } from '@/utils/photoIndex';

const INVALID_INDEXES = [null, undefined, -1, 5, 1.5, NaN, '2'];

describe('getPrevIndex', () => {
  test.each([
    [2, 5, 1], // 가운데
    [4, 5, 3], // 마지막
    [0, 5, null], // 첫 사진은 마지막으로 돌지 않아요
    [0, 1, null], // 한 장뿐
    [0, 0, null], // 빈 목록
  ])('번호 %s, 전체 %s장이면 %s예요', (index, length, expected) => {
    expect(getPrevIndex(index, length)).toBe(expected);
  });

  test.each(INVALID_INDEXES)('쓸 수 없는 번호 %s는 null이에요', (index) => {
    expect(getPrevIndex(index, 5)).toBeNull();
  });
});

describe('getNextIndex', () => {
  test.each([
    [2, 5, 3], // 가운데
    [0, 5, 1], // 첫 사진
    [4, 5, null], // 마지막 사진은 처음으로 돌지 않아요
    [0, 1, null], // 한 장뿐
    [0, 0, null], // 빈 목록
  ])('번호 %s, 전체 %s장이면 %s예요', (index, length, expected) => {
    expect(getNextIndex(index, length)).toBe(expected);
  });

  test.each(INVALID_INDEXES)('쓸 수 없는 번호 %s는 null이에요', (index) => {
    expect(getNextIndex(index, 5)).toBeNull();
  });
});
