import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { formatPassportRecords, selectPassportRecords } from '@/utils/passportRecords';

const stop = (id, cc, city, extra = {}) => ({
  id,
  cc,
  city,
  country: `${cc} 나라`,
  lat: 0,
  lng: 0,
  from: '2025-01-01T10:00:00+09:00',
  to: '2025-01-03T18:00:00+09:00',
  days: 3,
  photoCount: 1,
  coverFileKey: null,
  transit: false,
  ...extra,
});

/** 여행 하나에 지점을 순서대로 넣은 작은 journey를 만들어요. 집은 적도 · 본초 자오선(0, 0)이에요. */
const journeyOf = (...tripStops) => ({
  home: { lat: 0, lng: 0, city: '집' },
  stops: tripStops.flat(),
  legs: [],
  trips: tripStops.map((stops, index) => ({
    id: `t${index + 1}`,
    stopIds: stops.map((s) => s.id),
  })),
});

const NULL_RECORDS = { longestStay: null, farthest: null, mostVisited: null };

describe('selectPassportRecords', () => {
  test('seojin은 밴쿠버 57일 · 바르셀로나 9,599km · 일본 5회예요', () => {
    const { longestStay, farthest, mostVisited } = selectPassportRecords(seojin);

    // 사진은 교토(14장)가 가장 많아서, 밴쿠버(6장)는 "가장 많은 사진"이 아니에요.
    expect(longestStay.stop.city).toBe('밴쿠버');
    expect(longestStay.stop.days).toBe(57);
    expect(longestStay.hasMostPhotos).toBe(false);

    // 서울에서 파리 8,964km · 런던 8,855km보다 멀어요.
    expect(farthest).toMatchObject({ km: 9599, homeCity: '서울' });
    expect(farthest.stop.city).toBe('바르셀로나');

    // 일본 여행 다섯 번은 모두 서울에 돌아왔다가 다시 나갔어요. 대표 사진은 사진이 가장 많은 교토예요.
    expect(mostVisited).toMatchObject({
      cc: 'JP',
      country: '일본',
      visits: 5,
      cities: ['후쿠오카', '교토', '도쿄', '삿포로', '오사카'],
    });
    expect(mostVisited.coverStop.coverFileKey).toBe('public:/photos/kyoto-11.webp');
  });

  test('집에 안 들르고 이어진 여행(gap)은 한 번 간 걸로 세요', () => {
    // edge의 방콕 → gap → 치앙마이는 태국 한 번이에요. 따로 세면 태국이 먼저 들어가 2회로 미국과 같아져서 태국이 뽑혀요.
    expect(selectPassportRecords(edge).mostVisited).toMatchObject({
      cc: 'US',
      visits: 2,
      cities: ['호놀룰루', '뉴욕'],
    });
  });

  test('경유 지점은 머문 곳이 아니라서 어느 기록에도 들어가지 않아요', () => {
    const journey = journeyOf([
      stop('a', 'QA', '도하', { transit: true, days: 9, lat: 50 }),
      stop('b', 'TR', '이스탄불', { days: 2, lat: 10 }),
    ]);

    const { longestStay, farthest, mostVisited } = selectPassportRecords(journey);
    expect(longestStay.stop.city).toBe('이스탄불');
    expect(farthest.stop.city).toBe('이스탄불');
    expect(mostVisited.cc).toBe('TR');
  });

  test('값이 같으면 먼저 간 곳을 골라요', () => {
    const journey = journeyOf(
      [stop('a', 'JP', '도쿄', { lat: 10 }), stop('b', 'FR', '파리', { lat: -10 })],
      [stop('c', 'FR', '니스'), stop('d', 'JP', '오사카')],
    );

    const { longestStay, farthest, mostVisited } = selectPassportRecords(journey);
    expect(longestStay.stop.city).toBe('도쿄');
    expect(farthest.stop.city).toBe('도쿄');
    // 둘 다 2회라 먼저 들어간 일본이에요.
    expect(mostVisited).toMatchObject({ cc: 'JP', visits: 2, cities: ['도쿄', '오사카'] });
  });

  test('가장 오래 머문 곳에서 사진도 가장 많이 남겼으면 알려 줘요', () => {
    const journey = journeyOf([
      stop('a', 'JP', '도쿄', { days: 3, photoCount: 5 }),
      stop('b', 'CA', '밴쿠버', { days: 30, photoCount: 5 }),
    ]);

    expect(selectPassportRecords(journey).longestStay.hasMostPhotos).toBe(true);
  });

  test('집을 모르면 가장 먼 곳은 null이고 나머지 기록은 그대로예요', () => {
    const { longestStay, farthest, mostVisited } = selectPassportRecords({
      ...seojin,
      home: null,
    });

    expect(farthest).toBeNull();
    expect(longestStay.stop.city).toBe('밴쿠버');
    expect(mostVisited.cc).toBe('JP');
  });

  test('집이 있는 나라만 다녀왔으면 가장 많이 간 나라는 null이에요', () => {
    const journey = journeyOf([stop('a', 'KR', '부산')], [stop('b', 'KR', '강릉')]);

    const { longestStay, mostVisited } = selectPassportRecords(journey);
    expect(mostVisited).toBeNull();
    expect(longestStay.stop.city).toBe('부산');
  });

  test('한국은 몇 번을 가도 가장 많이 간 나라에서 빠져요', () => {
    // seojin은 한국 국내 여행도 5번이고 일본보다 먼저 갔어요(강릉). 세면 횟수가 같아 한국이 뽑혀요.
    expect(selectPassportRecords(seojin).mostVisited.cc).toBe('JP');
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['여행 0개', empty],
  ])('%s이면 기록이 모두 null이에요', (_, journey) => {
    expect(selectPassportRecords(journey)).toEqual(NULL_RECORDS);
  });
});

describe('formatPassportRecords', () => {
  test('seojin 카드 세 장의 글자와 사진이에요', () => {
    expect(formatPassportRecords(selectPassportRecords(seojin))).toEqual([
      {
        label: 'LONGEST STAY',
        value: '밴쿠버 · 57일',
        description: '캐나다에서 57일, 사진 6장을 남겼어요.',
        coverFileKey: 'public:/photos/vancouver-6.webp',
      },
      {
        label: 'FARTHEST',
        value: '바르셀로나 · 9,599km',
        description: '서울에서 가장 멀리 간 곳이에요. 2026.01.05에 도착했어요.',
        coverFileKey: 'public:/photos/barcelona-1.webp',
      },
      {
        label: 'MOST VISITED',
        value: '일본 · 5회',
        description: '후쿠오카 · 교토 · 도쿄 · 삿포로 · 오사카',
        coverFileKey: 'public:/photos/kyoto-11.webp',
      },
    ]);
  });

  test('가장 많은 사진도 남겼으면 설명에 한 문장을 더해요', () => {
    const journey = journeyOf([stop('a', 'CA', '밴쿠버', { days: 30, photoCount: 214 })]);

    expect(formatPassportRecords(selectPassportRecords(journey))[0].description).toBe(
      'CA 나라에서 30일, 사진 214장을 남겼어요. 가장 많은 사진(214장)도 여기서.',
    );
  });

  test('이름을 못 찾은 곳이면 나라 구절을 빼고 설명을 적어요', () => {
    // reverseCity가 실패하면 지점이 UNKNOWN_PLACE(나라 이름 · 코드 모두 빈 값)로 남아요.
    const journey = journeyOf([
      stop('a', '', '이름 없는 곳', { country: '', days: 9, photoCount: 4 }),
    ]);

    const [longestStay] = formatPassportRecords(selectPassportRecords(journey));
    expect(longestStay.value).toBe('이름 없는 곳 · 9일');
    expect(longestStay.description).toBe(
      '9일 동안 사진 4장을 남겼어요. 가장 많은 사진(4장)도 여기서.',
    );
  });

  test('도시가 다섯 곳을 넘으면 네 곳만 적고 나머지는 "외 N곳"으로 줄여요', () => {
    const cities = ['도쿄', '오사카', '교토', '삿포로', '후쿠오카', '나고야', '나하'];
    const journey = journeyOf(...cities.map((city) => [stop(city, 'JP', city)]));

    const [, , mostVisited] = formatPassportRecords(selectPassportRecords(journey));
    expect(mostVisited.value).toBe('JP 나라 · 7회');
    expect(mostVisited.description).toBe('도쿄 · 오사카 · 교토 · 삿포로 외 3곳');
  });

  test('null인 기록은 카드를 만들지 않아요', () => {
    const cards = formatPassportRecords(selectPassportRecords({ ...seojin, home: null }));

    expect(cards.map((card) => card.label)).toEqual(['LONGEST STAY', 'MOST VISITED']);
    expect(formatPassportRecords(NULL_RECORDS)).toEqual([]);
  });
});
