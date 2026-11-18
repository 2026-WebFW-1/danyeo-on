import { expect, test } from 'vitest';

import { formatSkippedCounts } from '@/utils/upload/formatSkippedCounts';

test('이유별 개수를 정해진 순서로 이어 적어요', () => {
  // given: 받지 않는 형식이 먼저 와도
  const skipped = [
    { fileName: '메모.txt', reason: 'unsupported' },
    { fileName: '._IMG_0001.jpg', reason: 'hidden' },
    { fileName: '.DS_Store', reason: 'hidden' },
  ];

  // when
  const text = formatSkippedCounts(skipped);

  // then
  expect(text).toBe('숨김 파일 2개 · 받지 않는 형식 1개');
});

test('뺀 파일이 없으면 빈 문자열이에요', () => {
  expect(formatSkippedCounts([])).toBe('');
});
