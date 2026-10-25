import { describe, expect, test } from 'vitest';

import { getCityKey } from '@/utils/cityKey';

describe('getCityKey', () => {
  test('나라 코드와 도시 이름을 묶어요', () => {
    expect(getCityKey({ cc: 'CA', city: '밴쿠버' })).toBe('CA/밴쿠버');
  });

  test('이름이 같아도 나라가 다르면 다른 키예요 (미국 포틀랜드, 호주 포틀랜드)', () => {
    expect(getCityKey({ cc: 'US', city: '포틀랜드' })).not.toBe(
      getCityKey({ cc: 'AU', city: '포틀랜드' }),
    );
  });

  test('같은 나라의 같은 도시는 같은 키예요', () => {
    expect(getCityKey({ cc: 'JP', city: '오사카' })).toBe(getCityKey({ cc: 'JP', city: '오사카' }));
  });
});
