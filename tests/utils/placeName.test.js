import { describe, expect, test } from 'vitest';

import { UNKNOWN_CITY } from '@/constants/geocode';
import edge from '@/data/fixtures/edge.group.json';
import heavy from '@/data/fixtures/heavy.group.json';
import seojin from '@/data/fixtures/seojin.group.json';
import { normalizeCityName, parsePlaceResponse } from '@/utils/placeName';

import samples from '../fixtures/geocode/nominatim.json';

const { responses } = samples;
const unknownIn = (cc, country) => ({ city: UNKNOWN_CITY, country, cc });

describe('normalizeCityName', () => {
  test.each([
    ['서울특별시', 'KR', '서울'],
    ['부산광역시', 'KR', '부산'],
    ['세종특별자치시', 'KR', '세종'],
    ['강릉시', 'KR', '강릉'],
    ['양양군', 'KR', '양양'],
    ['군산시', 'KR', '군산'],
    ['시흥시', 'KR', '시흥'],
    ['광주시', 'KR', '광주'],
    ['  서울특별시  ', 'KR', '서울'],
    ['시', 'KR', '시'],
    ['군', 'KR', '군'],
    ['도쿄도', 'JP', '도쿄'],
    ['교토시', 'JP', '교토'],
    ['福岡市', 'JP', '福岡'],
    ['후쿠오카', 'JP', '후쿠오카'],
    ['홋카이도', 'JP', '홋카이도'],
    ['시', 'JP', '시'],
    ['타이베이시', 'TW', '타이베이'],
    ['상하이시', 'CN', '상하이'],
    ['치앙마이주', 'TH', '치앙마이'],
    ['방콕', 'TH', '방콕'],
    ['주', 'TH', '주'],
    ['멕시코시티', 'MX', '멕시코시티'],
    ['호치민시', 'VN', '호치민시'],
    ['노스  밴쿠버', 'CA', '노스 밴쿠버'],
    ['강릉시', '', '강릉시'],
    ['', 'KR', ''],
    [undefined, 'KR', ''],
    [null, 'JP', ''],
    [123, 'JP', ''],
  ])('%j (%s) → %j', (name, cc, expected) => {
    expect(normalizeCityName(name, cc)).toBe(expected);
  });
});

describe('parsePlaceResponse: 실제 응답 샘플', () => {
  const expectedByCity = new Map(
    [...seojin.stops, ...edge.stops, ...heavy.stops].map((stop) => [stop.place.city, stop.place]),
  );
  // 도시 이름이 시연 데이터와 다르게 오는 곳이에요. 나라 이름과 코드는 같아야 해요.
  const differing = {
    밴쿠버: 'District of North Vancouver', // 지점 좌표가 항구 바다 위라 옆 지역 이름이 와요
    밴프: UNKNOWN_CITY, // 국립공원 안이라 도시 칸 없이 county만 와요
    '나이아가라 폴스': 'Niagara Falls', // OSM에 한국어 이름이 없어요
    발리: '페네벨', // 지점 좌표가 시골이라 마을 이름이 와요
  };

  const sampleNames = Object.keys(responses).filter((name) => expectedByCity.has(name));
  const matching = sampleNames.filter((name) => !Object.hasOwn(differing, name));

  test('기대값(*.group.json의 place)과 같은 도시가 28곳이에요', () => {
    expect(matching).toHaveLength(28);
    expect(sampleNames).toHaveLength(32);
  });

  test.each(matching)('%s는 기대값과 같아요', (name) => {
    expect(parsePlaceResponse(responses[name])).toEqual(expectedByCity.get(name));
  });

  test.each(Object.entries(differing))('%s는 도시 이름만 달라요', (name, city) => {
    const { country, cc } = expectedByCity.get(name);

    expect(parsePlaceResponse(responses[name])).toEqual({ city, country, cc });
  });

  test('시연 데이터에 없는 곳도 앱 표기로 바뀌어요', () => {
    expect(parsePlaceResponse(responses['안동'])).toEqual({
      city: '안동',
      country: '한국',
      cc: 'KR',
    });
    expect(parsePlaceResponse(responses['인터라켄'])).toEqual({
      city: '인터라켄',
      country: '스위스',
      cc: 'CH',
    });
    expect(parsePlaceResponse(responses['마카오'])).toEqual({
      city: '마카오',
      country: '마카오',
      cc: 'MO',
    });
  });

  test('바다는 이름 없는 곳이고 나라도 비어요', () => {
    expect(parsePlaceResponse(responses['바다'])).toEqual(unknownIn('', ''));
  });
});

describe('parsePlaceResponse: 도시 이름 고르기', () => {
  const place = (address, cc = 'fr') =>
    parsePlaceResponse({ address: { country_code: cc, ...address } });

  test('city, town, village, hamlet, municipality 순서로 읽어요', () => {
    const address = { city: 'A', town: 'B', village: 'C', hamlet: 'D', municipality: 'E' };

    expect(place(address).city).toBe('A');
    expect(place({ ...address, city: undefined }).city).toBe('B');
    expect(place({ ...address, city: '', town: null }).city).toBe('C');
    expect(place({ ...address, city: 1, town: [], village: {} }).city).toBe('D');
    expect(place({ municipality: 'E', hamlet: '  ' }).city).toBe('E');
  });

  test('county, state, suburb 같은 칸은 도시 이름으로 쓰지 않아요', () => {
    expect(place({ county: 'X', state: 'Y', suburb: 'Z', borough: 'W' })).toEqual(
      unknownIn('FR', '프랑스'),
    );
  });

  test('한국은 city가 없으면 군(county)을 쓰고 읍·면은 쓰지 않아요', () => {
    expect(place({ town: '양양읍', county: '양양군' }, 'kr').city).toBe('양양');
    expect(place({ town: '연곡면', city: '강릉시', county: '가짜군' }, 'kr').city).toBe('강릉');
    expect(place({ town: '양양읍' }, 'kr').city).toBe(UNKNOWN_CITY);
  });

  test('태국은 city가 없으면 도(province) 이름을 도시 이름으로 써요', () => {
    expect(place({ town: 'Suthep', province: '치앙마이주' }, 'th').city).toBe('치앙마이');
    expect(place({ city: '방콕', province: '방콕' }, 'th').city).toBe('방콕');
  });

  test.each(['GB-LND', 'GB-WSM', 'GB-CMD', 'GB-TWH', 'GB-KEC'])(
    '런던의 구(%s)는 런던으로 묶어요',
    (code) => {
      expect(place({ city: 'Borough', 'ISO3166-2-lvl8': code }, 'gb').city).toBe('런던');
      expect(place({ city: 'Borough', 'ISO3166-2-lvl6': code }, 'gb').city).toBe('런던');
    },
  );

  test('런던 밖의 영국 코드는 도시 칸을 그대로 써요', () => {
    expect(
      place({ city: '에든버러', 'ISO3166-2-lvl4': 'GB-SCT', 'ISO3166-2-lvl6': 'GB-EDH' }, 'gb'),
    ).toEqual({
      city: '에든버러',
      country: '영국',
      cc: 'GB',
    });
  });

  test('도쿄도 안은 도쿄로 묶고, 다른 현은 도시 칸을 그대로 써요', () => {
    expect(place({ city: '지요다구', 'ISO3166-2-lvl4': 'JP-13' }, 'jp').city).toBe('도쿄');
    expect(place({ city: '요코하마시', 'ISO3166-2-lvl4': 'JP-14' }, 'jp').city).toBe('요코하마');
    expect(place({ city: '도쿄도' }, 'jp').city).toBe('도쿄');
  });

  test('행정 코드가 문자열이 아니거나 칸 이름이 다르면 무시해요', () => {
    expect(place({ city: 'X', 'ISO3166-2-lvl4': 13 }, 'jp').city).toBe('X');
    expect(place({ city: 'X', 'ISO3166-2-lvl4': ['JP-13'] }, 'jp').city).toBe('X');
    expect(place({ city: 'X', ISO3166_2: 'JP-13', 'ISO3166-2': 'JP-13' }, 'jp').city).toBe('X');
  });

  test('도시 이름의 앞뒤 공백과 겹친 공백을 정리해요', () => {
    expect(place({ city: '  노스   밴쿠버 ' }, 'ca').city).toBe('노스 밴쿠버');
  });
});

describe('parsePlaceResponse: 나라', () => {
  const country = (address) => parsePlaceResponse({ address: { city: '서울', ...address } });

  test.each([
    ['kr', 'KR', '한국'],
    [' au ', 'AU', '호주'],
    ['jp', 'JP', '일본'],
    ['tw', 'TW', '대만'],
  ])('나라 코드 %j는 %s, %s로 바꿔요', (code, cc, name) => {
    expect(country({ country_code: code, country: 'English' })).toMatchObject({
      cc,
      country: name,
    });
  });

  test('홍콩·마카오는 나라 코드가 CN이어도 행정 코드로 알아봐요', () => {
    expect(country({ country_code: 'cn', 'ISO3166-2-lvl3': 'CN-HK' })).toMatchObject({
      cc: 'HK',
      country: '홍콩',
    });
    expect(country({ country_code: 'cn', 'ISO3166-2-lvl3': 'CN-MO' })).toMatchObject({
      cc: 'MO',
      country: '마카오',
    });
    expect(country({ 'ISO3166-2-lvl3': 'CN-HK' })).toMatchObject({ cc: 'HK' });
    expect(country({ country_code: 'cn', 'ISO3166-2-lvl4': 'CN-SH' })).toMatchObject({
      cc: 'CN',
      country: '중국',
    });
  });

  test.each(['KOR', 'K', '12', 'ZZ', '', undefined, null, 5])(
    '쓸 수 없는 나라 코드 %j는 나라 이름도 비우고 도시는 남겨요',
    (code) => {
      expect(country({ country_code: code, country: '대한민국' })).toEqual({
        city: '서울',
        country: '',
        cc: '',
      });
    },
  );

  test('브라우저가 모르는 나라 코드는 서비스가 준 나라 이름을 써요', () => {
    expect(country({ country_code: 'xx', country: ' Xland ' })).toMatchObject({
      cc: 'XX',
      country: 'Xland',
    });
  });
});

describe('parsePlaceResponse: 이름이 없거나 모양이 이상한 응답', () => {
  test.each([
    { error: 'Unable to geocode' },
    { error: '' },
    { address: {} },
    { address: { country_code: 'ca', county: 'Improvement District No. 9' } },
  ])('%j는 이름 없는 곳이에요', (json) => {
    expect(parsePlaceResponse(json)).toEqual(
      expect.objectContaining({ city: UNKNOWN_CITY, country: expect.any(String) }),
    );
  });

  test('이름 붙은 곳이 없다는 응답은 나라 없는 이름 없는 곳이에요', () => {
    expect(parsePlaceResponse({ error: 'Unable to geocode' })).toEqual(unknownIn('', ''));
  });

  test('도시 칸이 비어도 나라 코드가 있으면 나라는 남겨요', () => {
    expect(parsePlaceResponse({ address: { country_code: 'ca', country: 'Canada' } })).toEqual(
      unknownIn('CA', '캐나다'),
    );
  });

  test('나라 코드가 없어도 도시 이름은 남겨요', () => {
    expect(parsePlaceResponse({ address: { city: 'Foo' } })).toEqual({
      city: 'Foo',
      country: '',
      cc: '',
    });
  });

  test.each([
    null,
    undefined,
    'text',
    12,
    true,
    [],
    {},
    { name: '서울' },
    { error: { code: 400, message: 'bad' } },
    { error: 5 },
    { address: null },
    { address: [] },
    { address: 'Seoul' },
    { address: 7 },
  ])('%j는 위치 응답이 아니라서 null이에요', (json) => {
    expect(parsePlaceResponse(json)).toBeNull();
  });
});
