import { describe, expect, test } from 'vitest';

import { MAP_MAX_ZOOM } from '@/constants/mapZoom';
import { applyZoom, clampZoom, IDENTITY_ZOOM, panBy, unscaleAt, zoomAt } from '@/utils/mapZoom';
import { MAP_SIZE } from '@/utils/routeMap';

const { width: W, height: H } = MAP_SIZE;

describe('clampZoom', () => {
  test('배율은 1배 ~ 최대 배율 안에 있어요', () => {
    expect(clampZoom({ k: 0.5, x: 0, y: 0 }).k).toBe(1);
    expect(clampZoom({ k: 100, x: 0, y: 0 }).k).toBe(MAP_MAX_ZOOM);
  });

  test('1배면 옮길 수 없어요', () => {
    expect(clampZoom({ k: 1, x: 300, y: -200 })).toEqual(IDENTITY_ZOOM);
  });

  test('확대한 지도가 화면을 다 덮도록 옮기는 범위를 막아요', () => {
    expect(clampZoom({ k: 2, x: 50, y: 50 })).toEqual({ k: 2, x: 0, y: 0 });
    expect(clampZoom({ k: 2, x: -5000, y: -5000 })).toEqual({ k: 2, x: -W, y: -H });
  });
});

describe('zoomAt', () => {
  test('가운데 점 아래의 지도 자리는 확대해도 그대로예요', () => {
    const center = [700, 300];
    const next = zoomAt(IDENTITY_ZOOM, 2, center);
    expect(next.k).toBe(2);
    expect(applyZoom(next, center)).toEqual(center);
  });

  test('가운데를 주지 않으면 화면 가운데를 중심으로 확대해요', () => {
    const next = zoomAt(IDENTITY_ZOOM, 2);
    expect(applyZoom(next, [W / 2, H / 2])).toEqual([W / 2, H / 2]);
  });

  test('축소해서 1배가 되면 처음 자리로 돌아와요', () => {
    const zoomed = zoomAt(IDENTITY_ZOOM, 3, [1200, 100]);
    expect(zoomAt(zoomed, 1 / 3, [100, 700])).toEqual(IDENTITY_ZOOM);
  });

  test('최대 배율에서는 더 키우지 않아요', () => {
    const max = zoomAt(IDENTITY_ZOOM, MAP_MAX_ZOOM);
    expect(zoomAt(max, 2)).toEqual(max);
  });
});

describe('panBy', () => {
  test('끈 만큼 옮기고, 범위를 넘으면 끝에서 멈춰요', () => {
    const zoomed = zoomAt(IDENTITY_ZOOM, 2);
    expect(panBy(zoomed, 100, -50)).toEqual({ k: 2, x: zoomed.x + 100, y: zoomed.y - 50 });
    expect(panBy(zoomed, 9999, 9999)).toEqual({ k: 2, x: 0, y: 0 });
  });
});

describe('unscaleAt', () => {
  test('확대하지 않았으면 transform이 없어요', () => {
    expect(unscaleAt(1, 10, 20)).toBeUndefined();
  });

  test('그 점을 중심으로 1/k배 줄여요', () => {
    expect(unscaleAt(4, 10, 20)).toBe('translate(10 20) scale(0.25) translate(-10 -20)');
  });
});
