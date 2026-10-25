import { describe, expect, test } from 'vitest';

import {
  calcDaysBetween,
  toLocalDate,
  toLocalMonth,
  toLocalYear,
  toUtcDay,
} from '@/utils/localDate';

describe('현지 날짜 자르기', () => {
  test.each([
    ['2025-12-31T23:50:00-08:00', '2025-12-31', '2025-12', '2025'],
    ['2025-01-01T00:30:00+09:00', '2025-01-01', '2025-01', '2025'],
    ['2024-07-16T10:00:00+09:00', '2024-07-16', '2024-07', '2024'],
  ])('%s는 시간대를 바꾸지 않고 현지 값을 돌려줘요', (iso, date, month, year) => {
    expect(toLocalDate(iso)).toBe(date);
    expect(toLocalMonth(iso)).toBe(month);
    expect(toLocalYear(iso)).toBe(year);
  });
});

describe('toUtcDay', () => {
  test('현지 날짜의 UTC 자정이에요', () => {
    // UTC로 바꾸면 2026-01-01이지만, 현지 날짜는 12월 31일이에요.
    expect(toUtcDay('2025-12-31T23:50:00-08:00')).toBe(Date.UTC(2025, 11, 31));
  });

  test('같은 날이면 시각이 달라도 같은 값이에요', () => {
    expect(toUtcDay('2025-03-01T00:05:00+09:00')).toBe(toUtcDay('2025-03-01T23:55:00+09:00'));
  });
});

describe('calcDaysBetween', () => {
  test('같은 날은 0이에요', () => {
    expect(calcDaysBetween('2025-03-01T00:05:00+09:00', '2025-03-01T23:55:00+09:00')).toBe(0);
  });

  test('현지 날짜가 며칠 떨어져 있는지 돌려줘요', () => {
    // 방콕 · 다낭은 7/16에 끝나고 강릉은 8/15에 시작해요.
    expect(calcDaysBetween('2024-07-16T10:00:00+09:00', '2024-08-15T09:00:00+09:00')).toBe(30);
  });

  test('연말을 걸쳐도 맞아요', () => {
    expect(calcDaysBetween('2024-12-31T23:50:00-08:00', '2025-01-02T00:10:00-08:00')).toBe(2);
  });

  test('서머타임이 시작하는 날(2024-03-10)을 걸쳐도 정수예요', () => {
    // 시각으로 빼면 하루가 23시간인 날이 끼어서 1.96처럼 어긋나요.
    expect(calcDaysBetween('2024-03-09T23:30:00-08:00', '2024-03-11T00:10:00-07:00')).toBe(2);
  });

  test('거꾸로 주면 음수예요', () => {
    expect(calcDaysBetween('2025-01-02T00:10:00+00:00', '2024-12-31T23:50:00+00:00')).toBe(-2);
  });
});
