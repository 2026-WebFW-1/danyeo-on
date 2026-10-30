import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.group.json';
import heavy from '@/data/fixtures/heavy.group.json';
import seojin from '@/data/fixtures/seojin.group.json';
import { getCountryName } from '@/utils/countryName';

describe('getCountryName', () => {
  test.each([
    ['KR', '한국'],
    ['AU', '호주'],
    ['HK', '홍콩'],
    ['MO', '마카오'],
    ['TW', '대만'],
    ['US', '미국'],
    ['TR', '튀르키예'],
    ['GB', '영국'],
    ['JP', '일본'],
    ['VN', '베트남'],
  ])('%s는 %s예요', (cc, expected) => {
    expect(getCountryName(cc)).toBe(expected);
  });

  test.each(['kr', ' KR ', 'Kr'])('소문자나 공백이 있어도 알아봐요: %j', (cc) => {
    expect(getCountryName(cc)).toBe('한국');
  });

  test.each(['XX', 'ZZ', '', 'K', 'KOR', '12', null, undefined, 123])(
    '나라 코드가 아니면 undefined예요: %s',
    (cc) => {
      expect(getCountryName(cc)).toBeUndefined();
    },
  );

  test('시연 데이터의 모든 나라 이름과 같아요', () => {
    const places = [...seojin.stops, ...edge.stops, ...heavy.stops].map((stop) => stop.place);
    const ccs = [...new Set(places.map((place) => place.cc))];

    expect(ccs).toHaveLength(17);
    for (const cc of ccs) {
      const expected = places.find((place) => place.cc === cc).country;
      expect(getCountryName(cc)).toBe(expected);
    }
  });
});
