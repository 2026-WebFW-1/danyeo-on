import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { formatPassportStats, selectPassportStats } from '@/utils/passportStats';

describe('selectPassportStats', () => {
  test('seojin의 통계 6칸 숫자를 세요', () => {
    expect(selectPassportStats(seojin)).toEqual({
      km: 72492,
      flights: 18,
      flightHours: 94,
      nightsAway: 98,
      countries: 9,
      cities: 19,
      photos: 90,
    });
  });

  test('km · flights · countries · cities · photos는 00·03의 합계와 같아요', () => {
    const stats = selectPassportStats(edge);
    const totals = selectJourneyTotals(edge);

    expect(stats).toMatchObject({
      km: totals.km,
      flights: totals.flights,
      countries: totals.countries,
      cities: totals.cities,
      photos: totals.photos,
    });
  });

  test('비행 시간은 사진 시각이 아니라 거리로 추정해요. 공항에서 기다린 시간이 안 들어가요', () => {
    // 방콕 → 다낭(862km)은 사진 시각으로 20.5시간이지만 기내에 있던 시간은 1.6시간쯤이에요.
    const journey = {
      ...seojin,
      legs: [
        { ...seojin.legs[1], km: 862, hours: 20.5, mode: 'flight' },
        { ...seojin.legs[2], km: 800, hours: 9, mode: 'car' },
      ],
    };

    expect(selectPassportStats(journey).flightHours).toBe(2);
  });

  test('집 밖에서 잔 날은 여행마다 일수에서 하루를 빼서 더해요. 당일치기는 0박이에요', () => {
    const journey = {
      ...seojin,
      trips: [
        { ...seojin.trips[0], days: 6 },
        { ...seojin.trips[1], days: 1 },
      ],
    };

    expect(selectPassportStats(journey).nightsAway).toBe(5);
  });

  test('집에 안 들르고 다음 여행으로 이어지면(gap) 그 사이의 밤도 집 밖에서 잔 날에 더해요', () => {
    // edge는 방콕(9/1–9/3)에서 집에 안 들르고 치앙마이(9/21)로 이어져서, 9/3 → 9/21의 18박이 더해져요.
    const tripNights = edge.trips.reduce((sum, trip) => sum + trip.days - 1, 0);

    expect(selectPassportStats(edge).nightsAway).toBe(tripNights + 18);
  });

  test.each([
    ['여행이 0개인 journey', empty],
    ['journey가 없을 때', null],
  ])('%s는 전부 0이에요', (_, journey) => {
    expect(selectPassportStats(journey)).toEqual({
      km: 0,
      flights: 0,
      flightHours: 0,
      nightsAway: 0,
      countries: 0,
      cities: 0,
      photos: 0,
    });
  });
});

describe('formatPassportStats', () => {
  test('피그마 순서로 이름 · 숫자 · 설명 줄을 만들어요', () => {
    expect(formatPassportStats(selectPassportStats(seojin))).toEqual([
      { label: 'KM', value: '72,492', note: '지구 1.8바퀴' },
      { label: 'FLIGHTS', value: '18', note: '편도 기준' },
      { label: 'HOURS', value: '94', note: '기내에서' },
      { label: 'DAYS AWAY', value: '98', note: '집 밖에서 잔 날' },
      { label: 'COUNTRIES', value: '9', note: '19개 도시' },
      { label: 'PHOTOS', value: '90', note: '위치 기록된 사진' },
    ]);
  });

  test('지구 바퀴 수는 소수 첫째 자리까지 보여 줘요', () => {
    const stats = { ...selectPassportStats(empty), km: 48210 };

    expect(formatPassportStats(stats)[0].note).toBe('지구 1.2바퀴');
  });
});
