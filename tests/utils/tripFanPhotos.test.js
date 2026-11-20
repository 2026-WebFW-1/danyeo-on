import { describe, expect, test } from 'vitest';

import { ARRIVAL_FAN_CENTER_DEG, ARRIVAL_FAN_RADIUS } from '@/constants/arrivalFan';
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
    const poses = calcFanPoses(8);

    expect(poses).toHaveLength(8);
    for (const { x, y } of poses) {
      expect(x).toBeLessThanOrEqual(0);
      expect(y).toBeLessThan(0);
    }
  });

  test('첫 사진은 왼쪽, 마지막 사진은 위쪽이에요', () => {
    const poses = calcFanPoses(8);

    expect(poses[0].x).toBeLessThan(poses.at(-1).x);
    expect(poses[0].y).toBeGreaterThan(poses.at(-1).y);
    expect(poses[0].rotate).toBeLessThan(poses.at(-1).rotate);
  });

  test('한 장이면 가운데 방향에 놓아요', () => {
    const [pose] = calcFanPoses(1);

    const rad = (ARRIVAL_FAN_CENTER_DEG * Math.PI) / 180;
    expect(pose.x).toBeCloseTo(ARRIVAL_FAN_RADIUS * Math.cos(rad), 0);
    expect(pose.y).toBeCloseTo(ARRIVAL_FAN_RADIUS * Math.sin(rad), 0);
  });

  test('0장이면 빈 목록이에요', () => {
    expect(calcFanPoses(0)).toEqual([]);
  });
});
