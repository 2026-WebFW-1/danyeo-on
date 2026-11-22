import { describe, expect, test } from 'vitest';

import edgeGroup from '@/data/fixtures/edge.group.json';
import edge from '@/data/fixtures/edge.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import { getAirports } from '@/services/airportService';
import { calcDistanceKm } from '@/utils/distance';
import { buildJourney } from '@/utils/journey/buildJourney';
import { selectTransitCandidateIds } from '@/utils/transitCandidates';

// 인천공항이에요.
const AIRPORT = { lat: 37.469, lng: 126.451 };
const leg = (from, to, mode = 'flight') => ({ from, to, mode });

/** 집 → a → b → 집으로 다녀온 Journey예요. a가 공항 옆에서 2시간 머문 지점이에요. */
function makeJourney({ stop = {}, legs } = {}) {
  return {
    stops: [
      {
        id: 'a',
        lat: 37.46,
        lng: 126.44,
        from: '2025-04-10T08:00:00+09:00',
        to: '2025-04-10T10:00:00+09:00',
        ...stop,
      },
      {
        id: 'b',
        lat: 41.0,
        lng: 28.9,
        from: '2025-04-10T20:00:00+03:00',
        to: '2025-04-14T09:00:00+03:00',
      },
    ],
    legs: legs ?? [leg('home', 'a'), leg('a', 'b'), leg('b', 'home')],
  };
}

const candidatesOf = (journey, airports = [AIRPORT]) => [
  ...selectTransitCandidateIds(journey, airports),
];

describe('selectTransitCandidateIds', () => {
  test('비행기로 와서 공항 3km 안에 6시간 미만 머물고 비행기로 떠난 지점이에요', () => {
    expect(candidatesOf(makeJourney())).toEqual(['a']);
  });

  test('6시간 이상 머물렀으면 아니에요', () => {
    expect(candidatesOf(makeJourney({ stop: { to: '2025-04-10T13:59:59+09:00' } }))).toEqual(['a']);
    expect(candidatesOf(makeJourney({ stop: { to: '2025-04-10T14:00:00+09:00' } }))).toEqual([]);
  });

  test('머문 시간은 시간대를 넣어 계산해요', () => {
    // 적힌 시각은 2시간 차이지만 실제로는 7시간이에요.
    expect(candidatesOf(makeJourney({ stop: { to: '2025-04-10T10:00:00+04:00' } }))).toEqual([]);
  });

  test('공항에서 3km보다 멀면 아니에요', () => {
    // 위도 0.05도는 약 5.6km예요.
    expect(candidatesOf(makeJourney({ stop: { lat: AIRPORT.lat + 0.05 } }))).toEqual([]);
  });

  test('오거나 떠난 구간이 비행이 아니면 갈아탄 게 아니라서 아니에요', () => {
    const arrivedByTrain = [leg('home', 'a', 'train'), leg('a', 'b'), leg('b', 'home')];
    const leftByCar = [leg('home', 'a'), leg('a', 'b', 'car'), leg('b', 'home')];

    expect(candidatesOf(makeJourney({ legs: arrivedByTrain }))).toEqual([]);
    expect(candidatesOf(makeJourney({ legs: leftByCar }))).toEqual([]);
  });

  test('Journey가 없거나 공항 목록을 못 받았으면 후보가 없어요', () => {
    expect(candidatesOf(null)).toEqual([]);
    expect(candidatesOf(makeJourney(), [])).toEqual([]);
  });

  test('edge에서 경유 보정을 지우면 도하만 후보예요. 시내가 공항 옆인 토론토는 아니에요', async () => {
    const airports = await getAirports();
    const findPlace = (lat, lng) =>
      edgeGroup.stops.reduce((nearest, stop) =>
        calcDistanceKm({ lat, lng }, stop) < calcDistanceKm({ lat, lng }, nearest) ? stop : nearest,
      ).place;
    const corrections = edgeSeed.corrections.filter((item) => item.type !== 'transit');
    const journey = await buildJourney(edgeSeed.photos, corrections, findPlace);
    const cityOf = (id) => journey.stops.find((stop) => stop.id === id).city;

    expect(candidatesOf(journey, airports).map(cityOf)).toEqual(['도하']);
    // 이미 경유인 도하는 이동 구간이 없어서 다시 고르지 않아요.
    expect(candidatesOf(edge, airports)).toEqual([]);
  });
});

describe('getAirports', () => {
  test('대형 · 중형 공항의 좌표를 주고, 다시 불러도 같은 배열이에요', async () => {
    const airports = await getAirports();

    expect(airports.length).toBeGreaterThan(4000);
    expect(airports.every(({ lat, lng }) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180)).toBe(
      true,
    );
    expect(await getAirports()).toBe(airports);
  });
});
