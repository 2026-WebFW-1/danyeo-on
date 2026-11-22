import { describe, expect, test } from 'vitest';

import { formatPassDate, formatPassDateTime } from '@/utils/upload/pass/formatPassDate';

describe('formatPassDate', () => {
  test('촬영 날짜를 MM.DD로 보여 줘요', () => {
    // given
    const takenAt = '2024-07-03T10:15:42';

    // when
    const date = formatPassDate(takenAt);

    // then
    expect(date).toBe('07.03');
  });

  test('자정 직전에 찍은 사진도 현지 날짜 그대로예요', () => {
    // given: 연말 밤, 브라우저 시간대로 바꾸면 다음 해로 밀릴 수 있는 시각
    const takenAt = '2024-12-31T23:59:00';

    // when
    const date = formatPassDate(takenAt);

    // then
    expect(date).toBe('12.31');
  });

  test('촬영 시각이 없으면 --.--예요', () => {
    // given
    const takenAt = null;

    // when
    const date = formatPassDate(takenAt);

    // then
    expect(date).toBe('--.--');
  });
});

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
