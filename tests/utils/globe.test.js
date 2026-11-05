import { describe, expect, test } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  calcDraggedRotation,
  calcGlobePaths,
  calcInitialRotation,
  calcRouteDuration,
  calcRouteProgress,
  getLandDots,
  selectGlobeRoutes,
} from '@/utils/globe';

describe('selectGlobeRoutes', () => {
  test('최근 여행 여섯 개를 시간 순서로 고르고, 가까운 국내 여행은 빼요', () => {
    expect(selectGlobeRoutes(seojin).map((route) => route.city)).toEqual([
      '도쿄',
      '삿포로',
      '밴쿠버',
      '오사카',
      '파리',
      '이스탄불',
    ]);
  });

  test('여행에서 가장 오래 머문 도시를 고르고, 일수와 날짜는 여행 값을 써요', () => {
    const vancouver = selectGlobeRoutes(seojin).find((route) => route.city === '밴쿠버');
    const trip = seojin.trips.find((item) => item.id === vancouver.id);

    expect(vancouver).toMatchObject({ tripName: trip.name, days: trip.days, from: trip.from });
  });

  test('같은 도시는 최근 여행 하나만 남겨요', () => {
    const cities = selectGlobeRoutes(heavy).map((route) => route.city);

    expect(cities).toHaveLength(new Set(cities).size);
    expect(cities.length).toBeLessThanOrEqual(6);
  });

  test('경유지는 고르지 않아요', () => {
    const journey = {
      home: { lat: 37.5, lng: 127 },
      stops: [
        { id: 'a', lat: 25, lng: 121, days: 9, transit: true, cc: 'TW', city: '타이베이' },
        { id: 'b', lat: 13.7, lng: 100.5, days: 2, transit: false, cc: 'TH', city: '방콕' },
      ],
      trips: [{ id: 't', name: '방콕', days: 11, from: '2025-01-01', stopIds: ['a', 'b'] }],
    };

    expect(selectGlobeRoutes(journey).map((route) => route.city)).toEqual(['방콕']);
  });

  test('여행이 없거나 데이터를 읽는 중이면 빈 배열이에요', () => {
    expect(selectGlobeRoutes(empty)).toEqual([]);
    expect(selectGlobeRoutes(null)).toEqual([]);
  });
});

describe('calcInitialRotation', () => {
  test('여행이 없으면 피그마 00과 같은 자리에서 시작해요', () => {
    expect(calcInitialRotation(null, [])).toEqual([-155, -22]);
  });

  test('경로가 없으면 집을 가운데 둬요', () => {
    const [lambda, phi] = calcInitialRotation({ lat: 37.5, lng: 127 }, []);

    expect(lambda).toBeCloseTo(-127);
    expect(phi).toBe(-22);
  });
});

describe('calcDraggedRotation', () => {
  test('가로로 끈 만큼 돌아요', () => {
    const [lambda, phi] = calcDraggedRotation([-100, -22], 10, 0);

    expect(lambda).toBeGreaterThan(-100);
    expect(phi).toBe(-22);
  });

  test('극을 넘어가지 않아요', () => {
    expect(calcDraggedRotation([0, 0], 0, 100000)[1]).toBe(-80);
    expect(calcDraggedRotation([0, 0], 0, -100000)[1]).toBe(80);
  });
});

describe('calcRouteProgress', () => {
  test('처음에는 잠깐 아무것도 그리지 않아요', () => {
    expect(calcRouteProgress(0, 3)).toEqual({ arrivedCount: 0, current: { index: 0, t: 0 } });
  });

  test('경로를 그리는 중에는 도착으로 치지 않아요', () => {
    expect(calcRouteProgress(1300, 3)).toEqual({ arrivedCount: 0, current: { index: 0, t: 0.5 } });
  });

  test('다 그리고 쉬는 동안은 도착이고 지금 그리는 경로가 없어요', () => {
    expect(calcRouteProgress(2100, 3)).toEqual({ arrivedCount: 1, current: null });
  });

  test('시간이 다 지나면 전부 도착이에요', () => {
    expect(calcRouteProgress(calcRouteDuration(3), 3)).toEqual({ arrivedCount: 3, current: null });
  });

  test('경로가 없으면 그릴 것이 없어요', () => {
    expect(calcRouteProgress(0, 0)).toEqual({ arrivedCount: 0, current: null });
  });
});

describe('getLandDots', () => {
  const hasDotNear = (lng, lat) =>
    getLandDots().some(([x, y]) => Math.abs(x - lng) < 4 && Math.abs(y - lat) < 4);

  test('땅에는 점이 있고 바다에는 없어요', () => {
    expect(hasDotNear(133, -25)).toBe(true); // 호주 가운데
    expect(hasDotNear(-105, 55)).toBe(true); // 캐나다
    expect(hasDotNear(-150, 0)).toBe(false); // 태평양 가운데
  });

  test('한 번만 계산해요', () => {
    expect(getLandDots()).toBe(getLandDots());
  });
});

describe('calcGlobePaths', () => {
  const home = { lat: 37.5, lng: 127, city: '서울' };
  const routes = [
    { id: 'a', coordinates: [139.7, 35.7] },
    { id: 'b', coordinates: [121.5, 25] },
    { id: 'c', coordinates: [100.5, 13.7] },
    { id: 'd', coordinates: [151.2, -33.9] },
  ];
  const rotation = [-127, -22];

  test('여행이 없으면 지구본만 그려요', () => {
    const paths = calcGlobePaths(rotation, null, [], { arrivedCount: 0, current: null });

    expect(paths.land).not.toBe('');
    expect(paths.thickRoutes).toBe('');
    expect(paths.homePoint).toBe('');
  });

  test('카드가 있는 최근 세 경로만 굵게, 나머지는 가늘게 그려요', () => {
    const paths = calcGlobePaths(rotation, home, routes, { arrivedCount: 4, current: null });

    expect(paths.thinRoutes.match(/M/g)).toHaveLength(1);
    expect(paths.thickRoutes.match(/M/g)).toHaveLength(3);
  });

  test('그리는 중인 경로는 굵게 그리고 아직 도착 점을 찍지 않아요', () => {
    const paths = calcGlobePaths(rotation, home, routes, {
      arrivedCount: 0,
      current: { index: 0, t: 0.5 },
    });

    expect(paths.thickRoutes).not.toBe('');
    expect(paths.routePoints).toBe('');
  });

  test('뒤로 넘어간 집은 그리지 않아요', () => {
    const paths = calcGlobePaths([53, -22], home, [], { arrivedCount: 0, current: null });

    expect(paths.homePoint).toBe('');
  });
});
