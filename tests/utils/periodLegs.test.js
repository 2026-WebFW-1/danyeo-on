import { describe, expect, test } from 'vitest';

import { PERIODS } from '@/constants/journey';
import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectLegsByPeriod } from '@/utils/periodLegs';

/** 이름으로 여행을 찾아요. 같은 이름이 둘이면 첫 번째예요. */
function findTrip(journey, name) {
  return journey.trips.find((trip) => trip.name === name);
}

/** 결과에 든 구간 ID들이에요. */
function toLegIds(legs) {
  return new Set(legs.map((leg) => leg.id));
}

/** 1y 기간만 바꾼 journey를 만들어요. */
function withPeriod(journey, from, to) {
  return { ...journey, periods: { ...journey.periods, '1y': { from, to } } };
}

describe('selectLegsByPeriod', () => {
  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: ALL이면 journey.legs 전부예요', (_name, journey) => {
    expect(selectLegsByPeriod(journey, 'all')).toEqual(journey.legs);
  });

  test('seojin ALL에는 기준일 다음 날 도착하는 마지막 귀국 구간도 들어가요', () => {
    const last = seojin.legs.at(-1);

    expect(last.arriveAt.startsWith('2026-08-17')).toBe(true);
    expect(selectLegsByPeriod(seojin, 'all').at(-1)).toBe(last);
  });

  test('seojin 1Y에 시작일에 걸친 밴쿠버 · 밴프 여행이 통째로 들어가요', () => {
    const ids = toLegIds(selectLegsByPeriod(seojin, '1y'));
    const trip = findTrip(seojin, '밴쿠버 · 밴프');

    expect(trip.legIds.every((id) => ids.has(id))).toBe(true);
    expect(findTrip(seojin, '부산 · 경주').legIds.some((id) => ids.has(id))).toBe(false);
  });

  test('seojin 2Y에 시작일에 걸친 강릉 여행이 통째로 들어가요', () => {
    const ids = toLegIds(selectLegsByPeriod(seojin, '2y'));

    expect(findTrip(seojin, '강릉').legIds.every((id) => ids.has(id))).toBe(true);
    expect(findTrip(seojin, '방콕 · 다낭').legIds.some((id) => ids.has(id))).toBe(false);
  });

  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: 1Y ⊂ 2Y ⊂ ALL', (_name, journey) => {
    const [oneYear, twoYears, all] = PERIODS.map((period) =>
      toLegIds(selectLegsByPeriod(journey, period)),
    );

    expect([...oneYear].every((id) => twoYears.has(id))).toBe(true);
    expect([...twoYears].every((id) => all.has(id))).toBe(true);
  });

  test.each(PERIODS)('결과가 journey.legs의 순서와 같아요 (heavy %s)', (period) => {
    const legs = selectLegsByPeriod(heavy, period);
    const order = legs.map((leg) => heavy.legs.indexOf(leg));

    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test.each([seojin, edge, heavy].flatMap((journey) => PERIODS.map((period) => [journey, period])))(
    '여행 하나의 구간은 모두 들어가거나 모두 빠져요',
    (journey, period) => {
      const ids = toLegIds(selectLegsByPeriod(journey, period));

      for (const trip of journey.trips) {
        const included = trip.legIds.filter((id) => ids.has(id));
        expect([0, trip.legIds.length]).toContain(included.length);
      }
    },
  );

  test('들어간 여행은 집에서 떠나 집으로 돌아와요', () => {
    const legs = selectLegsByPeriod(seojin, '1y');

    expect(legs[0].kind).toBe('outbound');
    expect(legs.at(-1).kind).toBe('return');
  });

  test('edge: 앞뒤 여행(방콕, 치앙마이)이 둘 다 들어가면 gap 구간도 들어가요', () => {
    const gap = edge.legs.find((leg) => leg.kind === 'gap');

    expect(selectLegsByPeriod(edge, '2y')).toContain(gap);
    expect(selectLegsByPeriod(edge, '1y')).not.toContain(gap);
  });

  test('edge: 뒤 여행(치앙마이)만 들어가면 gap 구간은 빠져요', () => {
    // 방콕 여행이 끝난(09-03) 뒤부터 고르면 치앙마이(09-21~)만 들어가요.
    const journey = withPeriod(edge, '2024-09-10', '2024-12-31');
    const gap = edge.legs.find((leg) => leg.kind === 'gap');
    const legs = selectLegsByPeriod(journey, '1y');

    expect(legs).not.toContain(gap);
    expect(legs.map((leg) => leg.tripId)).toContain(findTrip(edge, '치앙마이').id);
    expect(legs.map((leg) => leg.tripId)).not.toContain(findTrip(edge, '방콕').id);
  });

  test('edge: 앞 여행(방콕)만 들어가도 gap 구간은 빠져요', () => {
    const journey = withPeriod(edge, '2024-09-01', '2024-09-10');
    const legs = selectLegsByPeriod(journey, '1y');

    expect(legs.map((leg) => leg.kind)).not.toContain('gap');
    expect(legs.every((leg) => leg.tripId === findTrip(edge, '방콕').id)).toBe(true);
  });

  test('기간의 양 끝 날짜에 걸친 여행도 들어가요', () => {
    const trip = findTrip(seojin, '오사카');
    // 오사카 여행은 2025-09-19 ~ 09-21이에요.
    const atStart = selectLegsByPeriod(withPeriod(seojin, '2025-09-21', '2025-09-30'), '1y');
    const atEnd = selectLegsByPeriod(withPeriod(seojin, '2025-09-01', '2025-09-19'), '1y');

    expect(atStart.map((leg) => leg.id)).toEqual(trip.legIds);
    expect(atEnd.map((leg) => leg.id)).toEqual(trip.legIds);
  });

  test('부를 때마다 새 배열이에요', () => {
    expect(selectLegsByPeriod(seojin, 'all')).not.toBe(selectLegsByPeriod(seojin, 'all'));
  });

  test('empty(periods: null)나 journey가 없으면 빈 배열이에요', () => {
    for (const period of PERIODS) {
      expect(selectLegsByPeriod(empty, period)).toEqual([]);
    }
    expect(selectLegsByPeriod(null, 'all')).toEqual([]);
    expect(selectLegsByPeriod(undefined, 'all')).toEqual([]);
  });

  test('없는 기간이면 빈 배열이에요', () => {
    expect(selectLegsByPeriod(seojin, '3y')).toEqual([]);
    expect(selectLegsByPeriod(seojin, 'anchor')).toEqual([]);
    expect(selectLegsByPeriod(seojin, undefined)).toEqual([]);
  });
});
