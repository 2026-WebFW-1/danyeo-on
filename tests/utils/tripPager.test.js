import { describe, expect, test } from 'vitest';

import { selectTripPage } from '@/utils/tripPager';

const trips = [
  { id: 'a', no: '01', name: '도쿄' },
  { id: 'b', no: '02', name: '방콕 · 다낭' },
  { id: 'c', no: '03', name: '캐나다 · 미국' },
];

describe('selectTripPage', () => {
  test('id로 고른 여행과 앞뒤 여행을 돌려줘요', () => {
    expect(selectTripPage(trips, 'b')).toEqual({
      current: trips[1],
      prev: trips[0],
      next: trips[2],
    });
  });

  test('첫 여행은 이전이 없고, 마지막 여행은 다음이 없어요', () => {
    expect(selectTripPage(trips, 'a').prev).toBeNull();
    expect(selectTripPage(trips, 'c').next).toBeNull();
  });

  test.each([null, undefined, '', 'nope'])('%s면 첫 여행이에요', (tripId) => {
    expect(selectTripPage(trips, tripId)).toEqual({
      current: trips[0],
      prev: null,
      next: trips[1],
    });
  });

  test('여행이 하나뿐이면 앞뒤가 없어요', () => {
    expect(selectTripPage([trips[0]], 'a')).toEqual({ current: trips[0], prev: null, next: null });
  });

  test('여행이 없으면 셋 다 null이에요', () => {
    expect(selectTripPage([], 'a')).toEqual({ current: null, prev: null, next: null });
  });
});
