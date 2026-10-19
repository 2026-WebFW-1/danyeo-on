import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { selectTrips, selectTripStats } from '@/utils/trips';

/** 이름으로 여행 ID를 찾아요. 같은 이름이 둘이면 첫 번째예요. */
function findTripId(journey, name) {
  return journey.trips.find((trip) => trip.name === name).id;
}

/** 한 여행에 도시 이름이 같은 지점이 여러 개 든 작은 journey를 만들어요. [나라 코드, ...]마다 지점 하나예요. */
function makeJourneyWithCities(...ccs) {
  const stops = ccs.map((cc, index) => ({
    id: `s${index}`,
    tripId: 't1',
    city: '포틀랜드',
    cc,
    transit: false,
    photoCount: 1,
  }));

  return {
    home: null,
    stops,
    legs: [],
    trips: [
      {
        id: 't1',
        name: '포틀랜드',
        from: '2025-01-01T09:00:00+00:00',
        to: '2025-01-03T09:00:00+00:00',
        days: 3,
        stopIds: stops.map((stop) => stop.id),
        legIds: [],
        chapter: false,
      },
    ],
  };
}

describe('selectTrips', () => {
  test('seojin은 여행 14개를 시간 순서대로, 01부터 번호를 붙여 돌려줘요', () => {
    const trips = selectTrips(seojin);

    expect(trips).toHaveLength(14);
    expect(trips.map((trip) => trip.no)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, '0')),
    );
    expect(trips[0].name).toBe('방콕 · 다낭');
    expect(trips[13].name).toBe('이스탄불');
  });

  test('날짜는 시간대가 붙은 값에서 현지 날짜만 잘라 써요', () => {
    expect(selectTrips(seojin)[0]).toMatchObject({
      from: '2024-07-11',
      to: '2024-07-16',
      days: 6,
      chapter: false,
    });
  });

  test('챕터가 있는 여행만 chapter가 true예요', () => {
    const chapters = selectTrips(seojin).filter((trip) => trip.chapter);

    expect(chapters.map((trip) => trip.name)).toEqual(['밴쿠버 · 밴프']);
  });

  test('edge는 여행 11개예요', () => {
    expect(selectTrips(edge)).toHaveLength(11);
  });

  test('여행이 없거나 journey가 없으면 빈 배열이에요', () => {
    expect(selectTrips(empty)).toEqual([]);
    expect(selectTrips(null)).toEqual([]);
    expect(selectTrips(undefined)).toEqual([]);
  });
});

describe('selectTripStats', () => {
  test.each([
    ['방콕 · 다낭', { days: 6, cities: 2, km: 7597, photos: 8 }],
    ['졸업 여행', { days: 14, cities: 3, km: 20044, photos: 11 }],
    ['밴쿠버 · 밴프', { days: 60, cities: 2, km: 17111, photos: 9 }],
  ])('seojin의 %s', (name, expected) => {
    expect(selectTripStats(seojin, findTripId(seojin, name))).toEqual(expected);
  });

  test('경유 지점(도하)은 도시와 사진 수에서 빠지고, 거리는 그대로 더해요', () => {
    expect(selectTripStats(edge, findTripId(edge, '이스탄불'))).toEqual({
      days: 3,
      cities: 1,
      km: 16532,
      photos: 3,
    });
  });

  test('도시가 셋인 여행도 세요', () => {
    expect(selectTripStats(edge, findTripId(edge, '토론토 · 나이아가라 폴스 · 뉴욕'))).toEqual({
      days: 8,
      cities: 3,
      km: 22721,
      photos: 8,
    });
  });

  test('집을 안 들르고 앞 여행에서 바로 온 구간(gap)은 도착한 여행의 거리에 들어가요', () => {
    // 방콕 → 치앙마이 586km는 tripId가 없어서 trip.legIds에 없지만, 치앙마이 여행의 이동이에요.
    expect(selectTripStats(edge, findTripId(edge, '치앙마이')).km).toBe(3475 + 586);
    expect(selectTripStats(edge, findTripId(edge, '방콕')).km).toBe(3722);
  });

  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: 여행별 km를 모두 더하면 모든 구간의 km와 같아요', (_name, journey) => {
    const perTrip = journey.trips.reduce(
      (sum, trip) => sum + selectTripStats(journey, trip.id).km,
      0,
    );
    const all = Math.round(journey.legs.reduce((sum, leg) => sum + leg.km, 0));

    expect(perTrip).toBe(all);
  });

  test('두 여행을 한 여행으로 합쳐도 이동 거리가 같아요', () => {
    // 07 화면에서 방콕과 치앙마이를 합친 상태: gap이 여행 안 구간(between)이 돼요.
    const before = edge.trips.find((trip) => trip.name === '방콕');
    const after = edge.trips.find((trip) => trip.name === '치앙마이');
    const gap = edge.legs.find((leg) => leg.kind === 'gap');
    const merged = { ...before, stopIds: [...before.stopIds, ...after.stopIds] };
    merged.legIds = [...before.legIds, gap.id, ...after.legIds];

    const journey = {
      ...edge,
      trips: [merged],
      legs: edge.legs.map((leg) =>
        leg.id === gap.id ? { ...leg, kind: 'between', tripId: merged.id } : leg,
      ),
    };

    const splitKm = selectTripStats(edge, before.id).km + selectTripStats(edge, after.id).km;

    expect(selectTripStats(journey, merged.id).km).toBe(splitKm);
  });

  test('이름이 같아도 나라가 다른 도시는 따로 세요 (미국 포틀랜드, 호주 포틀랜드)', () => {
    const journey = makeJourneyWithCities('US', 'AU');

    expect(selectTripStats(journey, 't1').cities).toBe(2);
  });

  test('같은 나라의 같은 도시는 몇 번 들러도 한 번만 세요', () => {
    const journey = makeJourneyWithCities('US', 'US');

    expect(selectTripStats(journey, 't1').cities).toBe(1);
  });

  test('도시 수가 selectJourneyTotals와 같아요', () => {
    const journey = makeJourneyWithCities('US', 'AU', 'US');

    expect(selectTripStats(journey, 't1').cities).toBe(selectJourneyTotals(journey).cities);
  });

  test('없는 여행 ID나 빈 journey는 null이에요', () => {
    expect(selectTripStats(seojin, 'p_none')).toBeNull();
    expect(selectTripStats(empty, 'p_none')).toBeNull();
    expect(selectTripStats(null, 'p_none')).toBeNull();
  });
});
