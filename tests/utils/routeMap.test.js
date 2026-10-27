import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  calcLegAngle,
  calcLegPoint,
  calcReachedStopIds,
  MAP_SIZE,
  mapProjection,
  splitByProgress,
  toLegLine,
  toLngLat,
} from '@/utils/routeMap';

const legs = seojin.legs;

describe('mapProjection', () => {
  test('1440 폭, 북위 76°가 위 끝, 남위 62°가 아래 끝이에요', () => {
    expect(MAP_SIZE).toEqual({ width: 1440, height: 799 });
    expect(mapProjection([150, 76])[1]).toBeCloseTo(0);
    expect(mapProjection([150, -62])[1]).toBeCloseTo(MAP_SIZE.height, 0);
  });

  test('태평양(동경 150°)이 가운데, 서경 30°가 양쪽 끝이에요', () => {
    expect(mapProjection([150, 0])[0]).toBeCloseTo(720);
    expect(mapProjection([-30.01, 0])[0]).toBeCloseTo(1440, 0);
    expect(mapProjection([-29.99, 0])[0]).toBeCloseTo(0, 0);
  });

  test('밴쿠버는 서울보다 오른쪽에 있어요 (태평양을 사이에 둬요)', () => {
    const [seoulX] = mapProjection([126.92, 37.55]);
    const [vancouverX] = mapProjection([-123.11, 49.3]);

    expect(vancouverX).toBeGreaterThan(seoulX);
  });
});

describe('toLngLat', () => {
  test('[위도, 경도]를 [경도, 위도]로 바꿔요', () => {
    expect(toLngLat([37.55789, 126.92071])).toEqual([126.92071, 37.55789]);
  });

  test('서경·남반구 값도 부호를 그대로 둬요', () => {
    expect(toLngLat([-33.87087, -123.11272])).toEqual([-123.11272, -33.87087]);
  });
});

describe('splitByProgress', () => {
  test('첫 구간 t: 0이면 다 그린 구간은 없고 나머지는 모두 뒤 구간이에요', () => {
    const { done, current, upcoming } = splitByProgress(legs, { legIndex: 0, t: 0 });

    expect(done).toEqual([]);
    expect(current).toEqual({ leg: legs[0], t: 0 });
    expect(upcoming).toEqual(legs.slice(1));
  });

  test('중간 구간이면 앞은 다 그리고, 지금 구간과 t를 따로 돌려줘요', () => {
    const { done, current, upcoming } = splitByProgress(legs, { legIndex: 3, t: 0.4 });

    expect(done).toEqual(legs.slice(0, 3));
    expect(current).toEqual({ leg: legs[3], t: 0.4 });
    expect(upcoming).toEqual(legs.slice(4));
  });

  test('마지막 구간 t: 1이면 뒤 구간이 없고 지금 구간은 도착한 상태예요', () => {
    const last = legs.length - 1;
    const { done, current, upcoming } = splitByProgress(legs, { legIndex: last, t: 1 });

    expect(done).toEqual(legs.slice(0, last));
    expect(current).toEqual({ leg: legs[last], t: 1 });
    expect(upcoming).toEqual([]);
  });

  test('progress가 null이면 모든 구간을 다 그린 상태예요', () => {
    expect(splitByProgress(legs, null)).toEqual({ done: legs, current: null, upcoming: [] });
  });

  test('구간이 0개(empty)면 셋 다 비어 있어요', () => {
    expect(splitByProgress(empty.legs, null)).toEqual({ done: [], current: null, upcoming: [] });
    expect(splitByProgress(empty.legs, { legIndex: 0, t: 0 })).toEqual({
      done: [],
      current: null,
      upcoming: [],
    });
  });

  test('legIndex가 구간 수를 넘으면 다 그린 상태로 봐요', () => {
    expect(splitByProgress(legs, { legIndex: legs.length, t: 0 }).current).toBeNull();
  });

  test('t가 0~1을 벗어나면 끝으로 맞춰요', () => {
    expect(splitByProgress(legs, { legIndex: 1, t: 1.3 }).current.t).toBe(1);
    expect(splitByProgress(legs, { legIndex: 1, t: -0.2 }).current.t).toBe(0);
  });
});

describe('calcLegPoint', () => {
  const [seoulToBangkok] = legs;

  test('t: 0은 출발, t: 1은 도착이에요 ([경도, 위도])', () => {
    const [startLng, startLat] = calcLegPoint(seoulToBangkok, 0);
    const [endLng, endLat] = calcLegPoint(seoulToBangkok, 1);

    expect(startLng).toBeCloseTo(126.92071);
    expect(startLat).toBeCloseTo(37.55789);
    expect(endLng).toBeCloseTo(100.51413);
    expect(endLat).toBeCloseTo(13.7538);
  });

  test('날짜변경선을 넘는 구간은 태평양 위로 가요 (부산 → 호놀룰루)', () => {
    const busanToHonolulu = edge.legs.find((leg) => leg.crossesAntimeridian);
    const [midLng] = calcLegPoint(busanToHonolulu, 0.5);

    // 반대편(유라시아·대서양)으로 돌면 경도가 0 근처가 돼요
    expect(Math.abs(midLng)).toBeGreaterThan(150);
  });
});

describe('calcLegAngle', () => {
  test('서울 → 밴쿠버는 오른쪽(동쪽)으로 가요', () => {
    const seoulToVancouver = legs.find((leg) => leg.crossesAntimeridian);
    const angle = calcLegAngle(seoulToVancouver, 0.5);

    expect(Math.abs(angle)).toBeLessThan(45);
  });

  test('서울 → 방콕은 왼쪽 아래(남서쪽)로 가요', () => {
    const angle = calcLegAngle(legs[0], 0.5);

    expect(angle).toBeGreaterThan(90);
    expect(angle).toBeLessThan(180);
  });

  test('출발(t: 0)·도착(t: 1)에서도 숫자를 돌려줘요', () => {
    expect(Number.isFinite(calcLegAngle(legs[0], 0))).toBe(true);
    expect(Number.isFinite(calcLegAngle(legs[0], 1))).toBe(true);
  });
});

describe('calcReachedStopIds', () => {
  test('다 그린 구간의 양 끝과 지금 구간의 출발지만 모아요 (home은 빼요)', () => {
    const split = splitByProgress(legs, { legIndex: 1, t: 0.5 });

    expect([...calcReachedStopIds(split)].sort()).toEqual(
      [legs[0].to, legs[1].from].filter((id, index, ids) => ids.indexOf(id) === index).sort(),
    );
  });

  test('지금 구간이 도착(t: 1)했으면 도착지도 넣어요', () => {
    const split = splitByProgress(legs, { legIndex: 1, t: 1 });

    expect(calcReachedStopIds(split).has(legs[1].to)).toBe(true);
  });

  test('progress가 null이면 모든 구간의 지점이 들어가요', () => {
    const ids = calcReachedStopIds(splitByProgress(legs, null));

    expect(ids.has('home')).toBe(false);
    expect(ids.size).toBe(seojin.stops.length);
  });
});

describe('toLegLine', () => {
  test('구간 전체를 출발·도착 두 점의 LineString으로 만들어요', () => {
    const line = toLegLine(legs[0]);

    expect(line.type).toBe('LineString');
    expect(line.coordinates).toHaveLength(2);
    expect(line.coordinates[0][0]).toBeCloseTo(126.92071);
    expect(line.coordinates[1][0]).toBeCloseTo(100.51413);
  });

  test('fromT·toT로 구간 일부만 만들어요', () => {
    const line = toLegLine(legs[0], 0, 0.5);

    expect(line.coordinates[1]).toEqual(calcLegPoint(legs[0], 0.5));
  });
});
