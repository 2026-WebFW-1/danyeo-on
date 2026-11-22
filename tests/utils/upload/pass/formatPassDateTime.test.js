import { describe, expect, test } from 'vitest';

import { formatPassDateTime } from '@/utils/upload/pass/formatPassDateTime';

describe('formatPassDateTime', () => {
  test('촬영 날짜와 시각을 MM.DD HH:mm으로 보여 줘요', () => {
    // given
    const takenAt = '2024-07-03T10:15:42';

    // when
    const dateTime = formatPassDateTime(takenAt);

    // then
    expect(dateTime).toBe('07.03 10:15');
  });

  test('촬영 시각이 없으면 null이에요', () => {
    // given
    const takenAt = null;

    // when
    const dateTime = formatPassDateTime(takenAt);

    // then
    expect(dateTime).toBeNull();
  });
});
