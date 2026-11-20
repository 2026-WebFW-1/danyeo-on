import { describe, expect, test } from 'vitest';

import {
  ARRIVAL_FAN_BOUNDS,
  ARRIVAL_FAN_JITTER_X,
  ARRIVAL_FAN_JITTER_Y,
  ARRIVAL_FAN_LIMIT,
  ARRIVAL_FAN_MAX_ROTATE,
  ARRIVAL_FAN_SLOTS,
} from '@/constants/arrivalFan';
import { scatterFanPoses, selectTripFanPhotos } from '@/utils/tripFanPhotos';

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

describe('scatterFanPoses', () => {
  const SEEDS = [0, 1, 42, 123456789, 2 ** 32 - 1];

  test('장수만큼 자리를 주고, 모두 화면 부품을 가리지 않는 범위 안이에요', () => {
    const { minX, maxX, minY, maxY } = ARRIVAL_FAN_BOUNDS;
    for (const seed of SEEDS) {
      const poses = scatterFanPoses(ARRIVAL_FAN_LIMIT, seed);
      expect(poses).toHaveLength(ARRIVAL_FAN_LIMIT);
      for (const { x, y, rotate } of poses) {
        expect(x).toBeGreaterThanOrEqual(minX);
        expect(x).toBeLessThanOrEqual(maxX);
        expect(y).toBeGreaterThanOrEqual(minY);
        expect(y).toBeLessThanOrEqual(maxY);
        expect(Math.abs(rotate)).toBeLessThanOrEqual(ARRIVAL_FAN_MAX_ROTATE);
      }
    }
  });

  test('같은 시드면 같은 자리이고, 시드가 다르면 다른 자리예요', () => {
    expect(scatterFanPoses(5, 42)).toEqual(scatterFanPoses(5, 42));
    expect(scatterFanPoses(5, 42)).not.toEqual(scatterFanPoses(5, 43));
  });

  test('사진이 적으면 카드에 가까운 자리 근처에만 놓아요', () => {
    const farthest = Math.hypot(ARRIVAL_FAN_SLOTS[3].x, ARRIVAL_FAN_SLOTS[3].y);
    const jitter = Math.hypot(ARRIVAL_FAN_JITTER_X, ARRIVAL_FAN_JITTER_Y);
    for (const seed of SEEDS) {
      for (const { x, y } of scatterFanPoses(2, seed)) {
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(farthest + jitter);
      }
    }
  });

  test('자리 수보다 많이 달라고 해도 자리 수만큼만 줘요', () => {
    expect(scatterFanPoses(20, 7)).toHaveLength(ARRIVAL_FAN_LIMIT);
    expect(scatterFanPoses(0, 7)).toEqual([]);
  });
});
