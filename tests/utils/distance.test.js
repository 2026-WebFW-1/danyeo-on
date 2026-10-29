import { describe, expect, test } from 'vitest';

import { calcDistanceKm } from '@/utils/distance';

const point = (lat, lng) => ({ lat, lng });

describe('calcDistanceKm', () => {
  test('같은 좌표는 0이에요', () => {
    expect(calcDistanceKm(point(37.5, 127), point(37.5, 127))).toBe(0);
  });

  test('위도 1도는 약 111.19km예요', () => {
    expect(calcDistanceKm(point(0, 0), point(1, 0))).toBeCloseTo(111.19, 1);
  });

  test('서울에서 부산까지는 약 325km예요', () => {
    const km = calcDistanceKm(point(37.5665, 126.978), point(35.1796, 129.0756));
    expect(km).toBeGreaterThan(323);
    expect(km).toBeLessThan(327);
  });

  test('앞뒤를 바꿔도 같아요', () => {
    const a = point(48.8567, 2.3466);
    const b = point(-33.8709, 151.2323);
    expect(calcDistanceKm(a, b)).toBe(calcDistanceKm(b, a));
  });

  test('날짜변경선을 건너도 가까운 쪽으로 재요', () => {
    expect(calcDistanceKm(point(0, 179.9), point(0, -179.9))).toBeCloseTo(22.24, 1);
  });

  test('지구 반대편도 NaN이 아니라 지구 둘레의 절반이에요', () => {
    expect(calcDistanceKm(point(0, 0), point(0, 180))).toBeCloseTo(20015.09, 1);
    expect(calcDistanceKm(point(90, 0), point(-90, 0))).toBeCloseTo(20015.09, 1);
  });

  test('북극에서는 경도가 달라도 같은 곳이에요', () => {
    expect(calcDistanceKm(point(90, 0), point(90, 123))).toBeCloseTo(0, 5);
  });
});
