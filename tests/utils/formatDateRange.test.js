import { describe, expect, test } from 'vitest';

import { formatDateRange } from '@/utils/formatDateRange';

describe('formatDateRange', () => {
  test('같은 해면 끝은 월·일만 적어요', () => {
    expect(formatDateRange('2025-01-03T09:00:00-08:00', '2025-03-05T21:00:00-08:00')).toBe(
      '2025.01.03 — 03.05',
    );
  });

  test('해가 바뀌면 끝에도 연도를 적어요', () => {
    expect(formatDateRange('2024-12-30T10:00:00+09:00', '2025-01-02T10:00:00+09:00')).toBe(
      '2024.12.30 — 2025.01.02',
    );
  });

  test('같은 날이면 하루만 적어요', () => {
    expect(formatDateRange('2025-03-06T08:00:00-05:00', '2025-03-06T23:30:00-05:00')).toBe(
      '2025.03.06',
    );
  });

  test('시간대가 붙은 시각도 현지 날짜 그대로예요(UTC로 바꾸지 않아요)', () => {
    // UTC로 바꾸면 2025-01-04가 되는 시각이에요.
    expect(formatDateRange('2025-01-03T23:30:00-08:00', '2025-01-03T23:59:00-08:00')).toBe(
      '2025.01.03',
    );
  });

  test('시간 없이 날짜만 줘도 돼요', () => {
    expect(formatDateRange('2024-07-11', '2024-07-16')).toBe('2024.07.11 — 07.16');
  });
});
