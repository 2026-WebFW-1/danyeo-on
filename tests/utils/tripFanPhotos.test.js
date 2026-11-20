import { describe, expect, test } from 'vitest';

import { ARRIVAL_FAN_LIMIT } from '@/constants/arrivalFan';
import { calcFanPoses, selectTripFanPhotos } from '@/utils/tripFanPhotos';

const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });

const photos = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'c1', 't1'].map(photo);

const stops = [
  {
    id: 'a1',
    city: '오사카',
    transit: false,
    photoIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
    coverFileKey: 'public:/photos/a3.webp',
  },
  { id: 't1', city: '경유', transit: true, photoIds: ['t1'], coverFileKey: null },
  {
    id: 'b1',
    city: '교토',
    transit: false,
    photoIds: ['b1', 'b2'],
    coverFileKey: 'public:/photos/b1.webp',
  },
  { id: 'c1', city: '나라', transit: false, photoIds: ['c1'], coverFileKey: null },
];

const trip = { id: 'a1', stopIds: ['a1', 't1', 'b1', 'c1'] };

const ids = (result) => result.photos.map((item) => item.id);

describe('selectTripFanPhotos', () => {
  test('지점마다 고르게 고르고, 여행 순서대로 놓아요', () => {
    const result = selectTripFanPhotos(trip, stops, photos, 5);

    // 한 장씩 돌아가며 오사카 2 · 교토 2 · 나라 1
    expect(ids(result)).toEqual(['a3', 'a1', 'b1', 'b2', 'c1']);
    expect(result.rest).toBe(3);
  });

  test('지점마다 대표 사진을 먼저 뽑고, 도시 이름을 붙여요', () => {
    const result = selectTripFanPhotos(trip, stops, photos, 3);

    expect(result.photos).toEqual([
      { id: 'a3', fileKey: 'public:/photos/a3.webp', city: '오사카' },
      { id: 'b1', fileKey: 'public:/photos/b1.webp', city: '교토' },
      { id: 'c1', fileKey: 'public:/photos/c1.webp', city: '나라' },
    ]);
  });

  test('경유 지점의 사진은 빼요', () => {
    const result = selectTripFanPhotos(trip, stops, photos, 20);

    expect(ids(result)).not.toContain('t1');
    expect(result.photos).toHaveLength(8);
    expect(result.rest).toBe(0);
  });

  test('사진 목록을 아직 못 받았으면 지점마다 대표 사진 한 장씩이에요', () => {
    const result = selectTripFanPhotos(trip, stops, [], 8);

    expect(ids(result)).toEqual(['a1', 'b1']);
  });

  test('여행이 없으면 빈 목록이에요', () => {
    expect(selectTripFanPhotos(undefined, stops, photos, 8)).toEqual({ photos: [], rest: 0 });
  });
});

describe('calcFanPoses', () => {
  test('장수만큼 자리를 주고, 모두 카드의 왼쪽 위에 놓여요', () => {
    const poses = calcFanPoses(ARRIVAL_FAN_LIMIT);

    expect(poses).toHaveLength(ARRIVAL_FAN_LIMIT);
    for (const { x, y } of poses) {
      expect(x).toBeLessThan(0);
      expect(y).toBeLessThan(0);
    }
  });

  test('사진이 적으면 카드에 가까운 자리부터 써요', () => {
    const distances = calcFanPoses(ARRIVAL_FAN_LIMIT).map(({ x, y }) => Math.hypot(x, y));

    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  test('흩뿌린 느낌이 나게 기울기가 사진마다 달라요', () => {
    const rotates = calcFanPoses(ARRIVAL_FAN_LIMIT).map((pose) => pose.rotate);

    expect(new Set(rotates).size).toBe(rotates.length);
  });

  test('0장이면 빈 목록이에요', () => {
    expect(calcFanPoses(0)).toEqual([]);
  });
});
