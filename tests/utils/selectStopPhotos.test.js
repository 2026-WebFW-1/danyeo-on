import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { findCoverIndex, selectStopPhotos } from '@/utils/selectStopPhotos';

const photos = [
  { id: 'p1', fileKey: 'public:/photos/a.webp', fileName: 'a.jpg' },
  { id: 'p2', fileKey: null, fileName: 'b.jpg' },
  { id: 'p3', fileKey: 'public:/photos/c.webp', fileName: 'c.jpg' },
];

const stop = { id: 'p1', photoIds: ['p3', 'p1', 'p2'], coverFileKey: 'public:/photos/a.webp' };

describe('selectStopPhotos', () => {
  test('지점의 photoIds 순서대로 id와 fileKey만 돌려줘요', () => {
    expect(selectStopPhotos(stop, photos)).toEqual([
      { id: 'p3', fileKey: 'public:/photos/c.webp' },
      { id: 'p1', fileKey: 'public:/photos/a.webp' },
      { id: 'p2', fileKey: null },
    ]);
  });

  test('이미지가 없는 사진(fileKey null)은 회색 칸으로 남겨요', () => {
    expect(selectStopPhotos(stop, photos)).toContainEqual({ id: 'p2', fileKey: null });
  });

  test('사진 목록에 없는 id는 건너뛰어요', () => {
    const result = selectStopPhotos({ ...stop, photoIds: ['p1', 'nope', 'p3'] }, photos);

    expect(result.map((ref) => ref.id)).toEqual(['p1', 'p3']);
  });

  test('사진 목록을 아직 못 받았어도 대표 사진 한 장은 돌려줘요', () => {
    expect(selectStopPhotos(stop, [])).toEqual([{ id: 'p1', fileKey: 'public:/photos/a.webp' }]);
  });

  test('목록도 대표 사진도 없으면 빈 배열이에요', () => {
    expect(selectStopPhotos({ ...stop, coverFileKey: null }, [])).toEqual([]);
  });

  test('seojin 밴쿠버(사진 6장)와 밴프(3장)를 모두 찾아요', () => {
    const vancouver = seojin.stops.find((s) => s.city === '밴쿠버');
    const banff = seojin.stops.find((s) => s.city === '밴프');

    expect(selectStopPhotos(vancouver, seojinSeed.photos)).toHaveLength(6);
    expect(selectStopPhotos(banff, seojinSeed.photos)).toHaveLength(3);
  });
});

describe('findCoverIndex', () => {
  const refs = [
    { id: 'p3', fileKey: 'public:/photos/c.webp' },
    { id: 'p1', fileKey: 'public:/photos/a.webp' },
  ];

  test('대표 사진이 목록의 몇 번째인지 돌려줘요', () => {
    expect(findCoverIndex(refs, 'public:/photos/a.webp')).toBe(1);
  });

  test.each([null, undefined, 'public:/photos/none.webp'])(
    '대표 사진이 %s면 첫 번째예요',
    (coverFileKey) => {
      expect(findCoverIndex(refs, coverFileKey)).toBe(0);
    },
  );

  test('빈 목록이면 0이에요', () => {
    expect(findCoverIndex([], 'public:/photos/a.webp')).toBe(0);
  });
});
