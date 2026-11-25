import { describe, expect, test } from 'vitest';

import { attachJosa, withObjectJosa, withTopicJosa } from '@/utils/josa';

describe('josa', () => {
  test('받침이 있으면 은 · 을을 붙여요', () => {
    expect(withTopicJosa('부산')).toBe('부산은');
    expect(withObjectJosa('방콕')).toBe('방콕을');
  });

  test('받침이 없으면 는 · 를을 붙여요', () => {
    expect(withTopicJosa('도쿄')).toBe('도쿄는');
    expect(withObjectJosa('파리')).toBe('파리를');
  });

  test('한글이 아니면 받침을 몰라서 둘 다 적어요', () => {
    expect(withTopicJosa('Seoul')).toBe('Seoul은(는)');
    expect(withObjectJosa('')).toBe('을(를)');
  });

  test('받침이 있는 글자를 직접 지정한 조사로도 붙여요', () => {
    expect(attachJosa('집', '이', '가')).toBe('집이');
    expect(attachJosa('나라', '이', '가')).toBe('나라가');
  });
});
