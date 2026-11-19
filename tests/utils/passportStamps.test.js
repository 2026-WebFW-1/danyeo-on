import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectPassportStamps } from '@/utils/passportStamps';

const stop = (id, cc, from, to, extra = {}) => ({
  id,
  cc,
  country: `${cc} 나라`,
  from: `${from}T10:00:00+09:00`,
  to: `${to}T18:00:00+09:00`,
  transit: false,
  ...extra,
});

/** 여행 하나에 지점을 순서대로 넣은 작은 journey를 만들어요. */
const journeyOf = (...tripStops) => ({
  stops: tripStops.flat(),
  trips: tripStops.map((stops, index) => ({
    id: `t${index + 1}`,
    stopIds: stops.map((s) => s.id),
  })),
});

describe('selectPassportStamps', () => {
  test('seojin은 나라에 처음 들어간 순서로 8개예요. 집이 있는 한국은 빠져요', () => {
    expect(selectPassportStamps(seojin).map((stamp) => stamp.cc)).toEqual([
      'TH',
      'VN',
      'JP',
      'CA',
      'FR',
      'GB',
      'ES',
      'TR',
    ]);
  });

  test('스탬프는 처음 들어간 여행 · 날짜 · 그 입국에서 머문 날을 가져요', () => {
    const stamps = selectPassportStamps(seojin);

    expect(stamps.find((stamp) => stamp.cc === 'JP')).toEqual({
      cc: 'JP',
      country: '일본',
      tripId: 'p_0c434a',
      enteredOn: '2024-10-03',
      days: 3,
    });
    // 밴쿠버(57일) → 밴프(2일)는 도시를 옮긴 날이 겹쳐서 6/28 ~ 8/26, 60일이에요.
    expect(stamps.find((stamp) => stamp.cc === 'CA')).toMatchObject({
      tripId: 'p_3c1060',
      enteredOn: '2025-06-28',
      days: 60,
    });
  });

  test('경유 지점은 스탬프를 찍지 않아요', () => {
    const transitCountries = edge.stops.filter((s) => s.transit).map((s) => s.cc);

    expect(transitCountries).toContain('QA');
    expect(selectPassportStamps(edge).map((stamp) => stamp.cc)).not.toContain('QA');
    expect(selectPassportStamps(edge)).toHaveLength(10);
  });

  test('같은 나라에 다른 나라를 들렀다 돌아오면 처음 머문 곳까지만 체류로 세요', () => {
    const journey = journeyOf([
      stop('a', 'JP', '2025-01-01', '2025-01-03'),
      stop('b', 'VN', '2025-01-04', '2025-01-05'),
      stop('c', 'JP', '2025-01-06', '2025-01-10'),
    ]);

    expect(selectPassportStamps(journey)).toEqual([
      { cc: 'JP', country: 'JP 나라', tripId: 't1', enteredOn: '2025-01-01', days: 3 },
      { cc: 'VN', country: 'VN 나라', tripId: 't1', enteredOn: '2025-01-04', days: 2 },
    ]);
  });

  test('한국은 스탬프를 찍지 않고, 한국에 들르면 앞 나라의 체류가 거기서 끊겨요', () => {
    const journey = journeyOf([
      stop('a', 'JP', '2025-01-01', '2025-01-03'),
      stop('b', 'KR', '2025-01-04', '2025-01-05'),
      stop('c', 'JP', '2025-01-06', '2025-01-10'),
    ]);

    expect(selectPassportStamps(journey)).toEqual([
      { cc: 'JP', country: 'JP 나라', tripId: 't1', enteredOn: '2025-01-01', days: 3 },
    ]);
  });

  test('다음 여행에서 다시 간 나라는 다시 찍지 않아요', () => {
    const journey = journeyOf(
      [stop('a', 'JP', '2025-01-01', '2025-01-03')],
      [stop('b', 'JP', '2025-05-01', '2025-05-09')],
    );

    expect(selectPassportStamps(journey)).toEqual([
      expect.objectContaining({ cc: 'JP', tripId: 't1', days: 3 }),
    ]);
  });

  test('나라 코드를 못 찾은 지점은 빼고, 나라 이름이 비면 코드로 이름을 찾아요', () => {
    const journey = journeyOf([
      stop('a', '', '2025-01-01', '2025-01-02', { country: '' }),
      stop('b', 'FR', '2025-01-03', '2025-01-04', { country: '' }),
    ]);

    expect(selectPassportStamps(journey)).toEqual([
      expect.objectContaining({ cc: 'FR', country: '프랑스' }),
    ]);
  });

  test.each([
    ['여행이 0개인 journey', empty],
    ['journey가 없을 때', null],
  ])('%s는 빈 배열이에요', (_, journey) => {
    expect(selectPassportStamps(journey)).toEqual([]);
  });
});
