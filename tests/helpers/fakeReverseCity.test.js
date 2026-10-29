import { describe, expect, test } from 'vitest';

import { UNKNOWN_PLACE } from '@/constants/geocode';
import edge from '@/data/fixtures/edge.group.json';
import empty from '@/data/fixtures/empty.group.json';
import heavy from '@/data/fixtures/heavy.group.json';
import seojin from '@/data/fixtures/seojin.group.json';

import { createFakeReverseCity } from './fakeReverseCity';

describe('createFakeReverseCity', () => {
  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s의 모든 지점 좌표에서 그 지점의 place를 돌려줘요', async (_name, group) => {
    const reverseCity = createFakeReverseCity(group);

    for (const stop of group.stops) {
      expect(await reverseCity(stop.lat, stop.lng)).toEqual(stop.place);
    }
  });

  test.each([
    ['seojin', seojin, '서울'],
    ['edge', edge, '부산'],
    ['heavy', heavy, '서울'],
  ])('%s의 집 좌표도 찾아요', async (_name, group, city) => {
    const reverseCity = createFakeReverseCity(group);

    expect((await reverseCity(group.home.lat, group.home.lng)).city).toBe(city);
  });

  test('모르는 좌표는 이름 없는 곳이에요', async () => {
    const reverseCity = createFakeReverseCity(seojin);

    expect(await reverseCity(0, 0)).toEqual(UNKNOWN_PLACE);
    expect(await reverseCity(37.55789, 126.9207)).toEqual(UNKNOWN_PLACE); // 한 자리가 달라요
  });

  test('지점이 없는 데이터(empty)는 무엇을 물어도 이름 없는 곳이에요', async () => {
    const reverseCity = createFakeReverseCity(empty);

    expect(await reverseCity(37.55789, 126.92071)).toEqual(UNKNOWN_PLACE);
  });

  test('돌려받은 객체를 고쳐도 다음 결과가 바뀌지 않아요', async () => {
    const reverseCity = createFakeReverseCity(seojin);
    const [{ lat, lng, place }] = seojin.stops;

    (await reverseCity(lat, lng)).city = '고침';
    expect(await reverseCity(lat, lng)).toEqual(place);
  });

  test('불린 좌표를 순서대로 기록해요', async () => {
    const reverseCity = createFakeReverseCity(seojin);

    await reverseCity(1, 2);
    await reverseCity(3, 4);
    expect(reverseCity.calls).toEqual([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ]);
  });
});
