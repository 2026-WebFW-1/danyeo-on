import { describe, expect, test } from 'vitest';

import {
  formatHomeEyebrow,
  formatHomeHeadline,
  formatHomeIntro,
  formatMiniStats,
} from '@/utils/homeScreen';

describe('formatHomeEyebrow', () => {
  test('시작 연도와 끝 연도를 이어요', () => {
    expect(formatHomeEyebrow({ from: '2024-07-11', to: '2026-08-16' })).toBe(
      '2024 — 2026  ·  WORLD JOURNEY',
    );
  });

  test('같은 해면 연도를 한 번만 써요', () => {
    expect(formatHomeEyebrow({ from: '2026-01-02', to: '2026-08-16' })).toBe(
      '2026  ·  WORLD JOURNEY',
    );
  });
});

describe('formatHomeHeadline', () => {
  test('피그마 00의 문장과 같아요', () => {
    expect(formatHomeHeadline({ from: '2024-07-11', to: '2026-08-16' }, 12)).toEqual([
      'Two years,',
      'twelve cities.',
    ]);
  });

  test.each([
    ['1년이면 단수', { from: '2025-01-01', to: '2026-01-01' }, 1, ['One year,', 'one city.']],
    [
      '1년이 안 되면 달',
      { from: '2026-01-01', to: '2026-08-01' },
      3,
      ['Seven months,', 'three cities.'],
    ],
    ['같은 달이면 1달', { from: '2026-08-01', to: '2026-08-20' }, 1, ['One month,', 'one city.']],
    [
      '단어가 없는 수는 숫자',
      { from: '2021-02-01', to: '2026-08-01' },
      87,
      ['Six years,', '87 cities.'],
    ],
  ])('%s', (_, range, cities, expected) => {
    expect(formatHomeHeadline(range, cities)).toEqual(expected);
  });
});

describe('formatHomeIntro', () => {
  test('시작 연월과 사진 수를 써요', () => {
    expect(formatHomeIntro({ firstTripStart: { year: 2024, month: 10 }, photos: 1284 })).toBe(
      '2024년 10월부터 지금까지, 1,284장의 사진이 지나온 길.',
    );
  });
});

describe('formatMiniStats', () => {
  test('피그마 00의 세 칸을 천 단위 쉼표로 만들어요', () => {
    expect(formatMiniStats({ cities: 12, countries: 7, km: 48210 })).toEqual([
      { value: '12', label: 'CITIES' },
      { value: '7', label: 'COUNTRIES' },
      { value: '48,210', label: 'KM FLOWN' },
    ]);
  });
});
