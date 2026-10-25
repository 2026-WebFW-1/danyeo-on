import { describe, expect, test } from 'vitest';

import { formatNo } from '@/utils/formatNo';

describe('formatNo', () => {
  test.each([
    [0, '00'],
    [1, '01'],
    [12, '12'],
    [123, '123'],
  ])('%i은 %s예요', (no, expected) => {
    expect(formatNo(no)).toBe(expected);
  });
});
