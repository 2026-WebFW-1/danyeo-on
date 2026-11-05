import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectLegsByTrip } from '@/utils/tripLegs';

/** 이름으로 여행을 찾아요. */
function findTrip(journey, name) {
  return journey.trips.find((trip) => trip.name === name);
}

describe('selectLegsByTrip', () => {
  test('그 여행의 구간만 집에서 떠나 집으로 돌아오는 순서로 돌려줘요', () => {
    const trip = findTrip(seojin, '졸업 여행');
    const legs = selectLegsByTrip(seojin, trip.id);

    expect(legs.map((leg) => leg.id)).toEqual(trip.legIds);
    expect(legs[0].kind).toBe('outbound');
    expect(legs.at(-1).kind).toBe('return');
  });

  test.each([
    ['seojin', seojin],
    ['heavy', heavy],
  ])('%s: gap이 없으면 모든 여행이 trip.legIds와 같아요', (_name, journey) => {
    for (const trip of journey.trips) {
      expect(selectLegsByTrip(journey, trip.id).map((leg) => leg.id)).toEqual(trip.legIds);
    }
  });

  test('edge: gap으로 도착한 여행(치앙마이)은 gap부터 재생해요', () => {
    const gap = edge.legs.find((leg) => leg.kind === 'gap');
    const legs = selectLegsByTrip(edge, findTrip(edge, '치앙마이').id);

    expect(legs[0]).toBe(gap);
    expect(legs.map((leg) => leg.kind)).toEqual(['gap', 'return']);
  });

  test('edge: gap으로 떠나는 여행(방콕)에는 gap이 안 들어가요', () => {
    const legs = selectLegsByTrip(edge, findTrip(edge, '방콕').id);

    expect(legs.map((leg) => leg.kind)).toEqual(['outbound']);
  });

  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: 모든 여행의 구간을 모으면 journey.legs와 정확히 같아요', (_name, journey) => {
    const ids = journey.trips.flatMap((trip) =>
      selectLegsByTrip(journey, trip.id).map((leg) => leg.id),
    );

    expect(ids).toEqual(journey.legs.map((leg) => leg.id));
  });

  test('구간 객체를 복사하지 않아요', () => {
    const [first] = selectLegsByTrip(seojin, seojin.trips[0].id);

    expect(seojin.legs).toContain(first);
  });

  test('부를 때마다 새 배열이에요', () => {
    const { id } = seojin.trips[0];

    expect(selectLegsByTrip(seojin, id)).not.toBe(selectLegsByTrip(seojin, id));
  });

  test('없는 id나 journey가 없으면 빈 배열이에요', () => {
    expect(selectLegsByTrip(seojin, 'p_none')).toEqual([]);
    expect(selectLegsByTrip(seojin, null)).toEqual([]);
    expect(selectLegsByTrip(empty, 'p_none')).toEqual([]);
    expect(selectLegsByTrip(null, seojin.trips[0].id)).toEqual([]);
    expect(selectLegsByTrip(undefined, seojin.trips[0].id)).toEqual([]);
  });
});
