import { describe, expect, test } from 'vitest';

import { getEnglishCountryName } from '@/utils/countryNameEn';

describe('getEnglishCountryName', () => {
  test.each([
    ['CA', 'Canada'],
    ['KR', 'South Korea'],
    ['JP', 'Japan'],
    ['US', 'United States'],
  ])('%s는 %s예요', (cc, expected) => {
    expect(getEnglishCountryName(cc)).toBe(expected);
  });

  test('소문자와 앞뒤 공백도 알아봐요', () => {
    expect(getEnglishCountryName(' ca ')).toBe('Canada');
  });

  test('홍콩·마카오는 뒤의 설명(SAR China)을 떼요', () => {
    expect(getEnglishCountryName('HK')).toBe('Hong Kong');
    expect(getEnglishCountryName('MO')).toBe('Macao');
  });

  test.each(['', 'ZZ', 'XYZ', '1', null, undefined])('%s는 undefined예요', (cc) => {
    expect(getEnglishCountryName(cc)).toBeUndefined();
  });
});
