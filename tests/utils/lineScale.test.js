import { describe, expect, test } from 'vitest';

import { DOT_MAX_PX, DOT_MIN_PX, LINE_MAX_PX, LINE_MIN_PX } from '@/constants/places';
import { calcDotSize, calcLineWidth } from '@/utils/lineScale';

describe('calcLineWidth', () => {
  // 피그마 03에서 읽은 값이에요: 551·573km 1.2px, 2,815km 1.64px, 8,159km 2.86px
  test.each([
    [551, 1.2],
    [573, 1.2],
    [2815, 1.64],
    [8159, 2.86],
  ])('%skm는 약 %spx예요', (km, expected) => {
    expect(calcLineWidth(km)).toBeCloseTo(expected, 1);
  });

  test('멀수록 굵어져요', () => {
    expect(calcLineWidth(3000)).toBeGreaterThan(calcLineWidth(1500));
    expect(calcLineWidth(8000)).toBeGreaterThan(calcLineWidth(3000));
  });

  test('아주 짧으면 가장 가는 선, 아주 멀면 가장 굵은 선에서 멈춰요', () => {
    expect(calcLineWidth(1)).toBe(LINE_MIN_PX);
    expect(calcLineWidth(40000)).toBe(LINE_MAX_PX);
  });

  test.each([0, -5, null, undefined, NaN])('%s는 가장 가는 선이에요', (km) => {
    expect(calcLineWidth(km)).toBe(LINE_MIN_PX);
  });
});

describe('calcDotSize', () => {
  // 피그마 03에서 읽은 값이에요: 5일 10.67px, 12일 11.6px, 62일 18px
  test.each([
    [5, 10.67],
    [12, 11.6],
    [62, 18],
  ])('%s일은 약 %spx예요', (days, expected) => {
    expect(calcDotSize(days)).toBeCloseTo(expected, 2);
  });

  test('오래 머물수록 커지고 18px에서 멈춰요', () => {
    expect(calcDotSize(30)).toBeGreaterThan(calcDotSize(10));
    expect(calcDotSize(365)).toBe(DOT_MAX_PX);
  });

  test.each([0, -1, null, undefined, NaN])('%s는 가장 작은 점이에요', (days) => {
    expect(calcDotSize(days)).toBe(DOT_MIN_PX);
  });
});
