import { describe, expect, test } from 'vitest';

import { formatPostDate, isPostDirty, normalizeTags } from '@/utils/postForm';

describe('normalizeTags', () => {
  test('앞의 #과 앞뒤 공백을 떼고, 같은 태그는 한 번만 남겨요', () => {
    expect(normalizeTags(['#밴쿠버', '밴쿠버', ' 여름 '])).toEqual(['밴쿠버', '여름']);
  });

  test('공백 뒤의 #과 겹친 #도 떼요', () => {
    expect(normalizeTags([' #여름', '##겨울'])).toEqual(['여름', '겨울']);
  });

  test('떼고 나서 빈 값은 빼요', () => {
    expect(normalizeTags(['', '  ', '#', '# '])).toEqual([]);
  });

  test('가운데 공백과 #은 그대로 둬요', () => {
    expect(normalizeTags(['여름 방학', 'C#'])).toEqual(['여름 방학', 'C#']);
  });
});

describe('isPostDirty', () => {
  const saved = { title: '제목', body: '본문', tags: ['밴쿠버'], photoIds: ['p_a'] };

  test('네 칸이 같으면 false예요', () => {
    expect(isPostDirty(saved, { ...saved, tags: ['밴쿠버'], photoIds: ['p_a'] })).toBe(false);
  });

  test.each([
    ['title', '새 제목'],
    ['body', '새 본문'],
    ['tags', ['밴쿠버', '여름']],
    ['tags', []],
    ['photoIds', ['p_b']],
    ['photoIds', ['p_a', 'p_b']],
  ])('%s가 %j로 다르면 true예요', (field, value) => {
    expect(isPostDirty(saved, { ...saved, [field]: value })).toBe(true);
  });

  test('태그 순서가 다르면 true예요', () => {
    const two = { ...saved, tags: ['a', 'b'] };
    expect(isPostDirty(two, { ...saved, tags: ['b', 'a'] })).toBe(true);
  });
});

describe('formatPostDate', () => {
  test.each([
    ['2025-07-12', '2025.07.12 (토)'],
    ['2025-07-13', '2025.07.13 (일)'],
    ['2025-12-31', '2025.12.31 (수)'],
    ['2026-01-01', '2026.01.01 (목)'],
  ])('%s는 %s예요', (date, expected) => {
    expect(formatPostDate(date)).toBe(expected);
  });
});
