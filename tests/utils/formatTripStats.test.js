import { describe, expect, test } from 'vitest';

import { formatTripStats } from '@/utils/formatTripStats';

describe('formatTripStats', () => {
  test('기간 · 도시 · 이동 · 사진 순서로 StatRow가 받는 모양을 만들어요', () => {
    expect(formatTripStats({ days: 87, cities: 4, km: 13210, photos: 628 })).toEqual([
      { value: '87일', label: '기간' },
      { value: '4', label: '도시' },
      { value: '13,210km', label: '이동' },
      { value: '628', label: '사진' },
    ]);
  });

  test('0이어도 그대로 보여 줘요', () => {
    expect(formatTripStats({ days: 1, cities: 0, km: 0, photos: 0 })).toEqual([
      { value: '1일', label: '기간' },
      { value: '0', label: '도시' },
      { value: '0km', label: '이동' },
      { value: '0', label: '사진' },
    ]);
  });

  test('1,000이 넘는 사진 수에도 천 단위 쉼표를 넣어요', () => {
    expect(formatTripStats({ days: 10, cities: 3, km: 1200, photos: 1234 })[3]).toEqual({
      value: '1,234',
      label: '사진',
    });
  });
});
