import { describe, expect, test } from 'vitest';

import { formatInbound } from '@/utils/formatInbound';

describe('formatInbound', () => {
  test.each([
    ['flight', 3250, '비행 · 3,250km'],
    ['train', 552, '기차 · 552km'],
    ['car', 90, '차 · 90km'],
  ])('%s %skm → %s', (mode, km, expected) => {
    expect(formatInbound({ mode, km })).toBe(expected);
  });

  test('소수는 반올림해요', () => {
    expect(formatInbound({ mode: 'train', km: 551.6 })).toBe('기차 · 552km');
  });

  test('브라우저 언어와 상관없이 천 단위 쉼표예요', () => {
    expect(formatInbound({ mode: 'flight', km: 12345 })).toBe('비행 · 12,345km');
  });
});
