import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectJourneyTotals } from '@/utils/journeyTotals';

describe('selectJourneyTotals', () => {
  test.each([
    [
      'seojin',
      seojin,
      {
        stops: 19,
        trips: 14,
        cities: 19,
        countries: 9,
        km: 72492,
        photos: 90,
        flights: 18,
        firstTripStart: { year: 2024, month: 7 },
      },
    ],
    [
      'edge',
      edge,
      {
        stops: 14,
        trips: 11,
        cities: 13,
        countries: 10,
        km: 145293,
        photos: 41,
        flights: 20,
        firstTripStart: { year: 2024, month: 9 },
      },
    ],
    [
      'heavy',
      heavy,
      {
        stops: 109,
        trips: 59,
        cities: 22,
        countries: 15,
        km: 695739,
        photos: 5217,
        flights: 148,
        firstTripStart: { year: 2021, month: 2 },
      },
    ],
  ])('%s의 합계', (_name, journey, expected) => {
    expect(selectJourneyTotals(journey)).toEqual(expected);
  });

  test('경유 지점(도하)은 지점·나라·사진 수에서 빠져요', () => {
    const transit = edge.stops.filter((stop) => stop.transit);
    const totals = selectJourneyTotals(edge);

    expect(transit).toHaveLength(1);
    expect(totals.stops).toBe(edge.stops.length - 1);
    // 경유 1장을 빼서 42장이 아니라 41장이에요.
    expect(totals.photos).toBe(41);
  });

  describe('나라 코드가 빈 지점(이름을 못 찾은 곳)', () => {
    const withoutCountry = (stop) => ({ ...stop, cc: '', country: '', city: '이름 없는 곳' });
    const stopsOf = (journey) => journey.stops.filter((stop) => !stop.transit);

    test('나라가 겹치는 지점이 비어도 나라 수는 그대로예요', () => {
      const ccs = stopsOf(seojin).map((stop) => stop.cc);
      const repeated = stopsOf(seojin).find(
        (stop) => ccs.filter((cc) => cc === stop.cc).length > 1,
      );
      const journey = {
        ...seojin,
        stops: seojin.stops.map((stop) => (stop === repeated ? withoutCountry(stop) : stop)),
      };

      expect(selectJourneyTotals(journey).countries).toBe(selectJourneyTotals(seojin).countries);
    });

    test('나라가 하나뿐인 지점이 비면 나라 수가 하나 줄어요', () => {
      const ccs = stopsOf(seojin).map((stop) => stop.cc);
      const only = stopsOf(seojin).find((stop) => ccs.filter((cc) => cc === stop.cc).length === 1);
      const journey = {
        ...seojin,
        stops: seojin.stops.map((stop) => (stop === only ? withoutCountry(stop) : stop)),
      };

      expect(selectJourneyTotals(journey).countries).toBe(
        selectJourneyTotals(seojin).countries - 1,
      );
    });

    test('모든 지점이 비면 나라는 0개예요', () => {
      const journey = { ...seojin, stops: seojin.stops.map(withoutCountry) };

      expect(selectJourneyTotals(journey).countries).toBe(0);
    });
  });

  test('여행이 없으면 전부 0이고 첫 여행 시작은 null이에요', () => {
    expect(selectJourneyTotals(empty)).toEqual({
      stops: 0,
      trips: 0,
      cities: 0,
      countries: 0,
      km: 0,
      photos: 0,
      flights: 0,
      firstTripStart: null,
    });
  });

  test('journey가 없어도 빈 합계예요', () => {
    expect(selectJourneyTotals(null)).toEqual(selectJourneyTotals(empty));
    expect(selectJourneyTotals(undefined)).toEqual(selectJourneyTotals(empty));
  });

  test('첫 여행의 월은 현지 시각 그대로 읽어요 (UTC로 바꾸지 않아요)', () => {
    // 현지 9월 1일 00:30(+09:00)은 UTC로는 8월 31일이라, Date로 읽으면 8월이 돼요.
    const journey = {
      ...empty,
      trips: [{ from: '2024-09-01T00:30:00+09:00' }],
    };

    expect(selectJourneyTotals(journey).firstTripStart).toEqual({ year: 2024, month: 9 });
  });
});
