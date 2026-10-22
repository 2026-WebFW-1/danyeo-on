import { describe, expect, test } from 'vitest';

import { cn } from '@/utils/cn';

describe('cn', () => {
  test.each([
    ['text-hero', 'text-ink'],
    ['text-display-sm', 'text-accent'],
    ['text-display-md', 'text-muted'],
    ['text-display-lg', 'text-body'],
    ['text-2xs', 'text-dim'],
    ['text-md', 'text-ink'],
  ])('크기(%s)와 색(%s)을 둘 다 남겨요', (size, color) => {
    expect(cn(size, color)).toBe(`${size} ${color}`);
  });

  test.each([
    ['text-sm', 'text-hero', 'text-hero'],
    ['text-hero', 'text-display-lg', 'text-display-lg'],
    ['leading-body-md', 'leading-body-lg', 'leading-body-lg'],
    ['rounded-sm', 'rounded-pill', 'rounded-pill'],
    ['rounded-pill', 'rounded-round', 'rounded-round'],
  ])('%s, %s 순서로 쓰면 %s만 남겨요', (before, after, expected) => {
    expect(cn(before, after)).toBe(expected);
  });

  test('크기 뒤에 본문 줄 높이를 붙이면 둘 다 남겨요', () => {
    expect(cn('text-md', 'leading-body-md')).toBe('text-md leading-body-md');
  });
});
