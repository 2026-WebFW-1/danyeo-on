import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import {
  formatPhotoCaption,
  getDayNumber,
  pickEditPhoto,
  selectPhotosOfDate,
} from '@/utils/chapterEdit';
import { selectStopPhotoDetails } from '@/utils/selectStopPhotos';

const photo = (id, takenAt, overrides = {}) => ({
  id,
  fileKey: `public:/photos/${id}.webp`,
  fileName: `${id}.JPG`,
  takenAt,
  ...overrides,
});
const ids = (list) => list.map((item) => item.id);

describe('selectPhotosOfDate', () => {
  test('그날(현지 날짜) 찍은 사진만 촬영 순서로 골라요', () => {
    const photos = [
      photo('late', '2025-07-12T18:00:00'),
      photo('other', '2025-07-13T09:00:00'),
      photo('early', '2025-07-12T08:30:00'),
    ];

    expect(ids(selectPhotosOfDate(photos, '2025-07-12'))).toEqual(['early', 'late']);
  });

  test('촬영 시각이 없는 사진은 어느 날인지 몰라서 빼요', () => {
    const photos = [
      photo('none', null),
      photo('missing', undefined),
      photo('day', '2025-07-12T08:30:00'),
    ];

    expect(ids(selectPhotosOfDate(photos, '2025-07-12'))).toEqual(['day']);
  });

  test('그날 찍은 사진이 없으면 빈 배열이에요', () => {
    expect(selectPhotosOfDate([photo('a', '2025-07-13T09:00:00')], '2025-07-12')).toEqual([]);
    expect(selectPhotosOfDate([], '2025-07-12')).toEqual([]);
  });

  test('받은 배열의 순서는 바꾸지 않아요', () => {
    const photos = [photo('b', '2025-07-12T18:00:00'), photo('a', '2025-07-12T08:30:00')];

    selectPhotosOfDate(photos, '2025-07-12');

    expect(ids(photos)).toEqual(['b', 'a']);
  });
});

describe('getDayNumber', () => {
  // 지점의 from은 현지 시간대가 붙어 있어요. 밴쿠버(-07:00) 저녁 6시 반은 UTC로는 다음 날이에요.
  const stop = { from: '2025-06-28T18:30:51-07:00' };

  test('지점의 첫날이 Day 1이에요(시간대가 붙은 UTC 날짜가 아니라 현지 날짜로 세요)', () => {
    expect(getDayNumber(stop, '2025-06-28')).toBe(1);
  });

  test('날짜가 하루 지날 때마다 1씩 늘어요', () => {
    expect(getDayNumber(stop, '2025-06-29')).toBe(2);
    expect(getDayNumber(stop, '2025-07-12')).toBe(15);
  });

  test('달·해가 바뀌어도 이어서 세요', () => {
    expect(getDayNumber({ from: '2025-12-30T10:00:00+09:00' }, '2026-01-02')).toBe(4);
    expect(getDayNumber({ from: '2024-02-28T10:00:00+01:00' }, '2024-03-01')).toBe(3);
  });

  test('지점이 시작하기 전 날짜면 null이에요', () => {
    expect(getDayNumber(stop, '2025-06-27')).toBeNull();
  });

  test('seojin 밴쿠버의 14a 데모 글(2025.07.12)은 Day 15예요', () => {
    const vancouver = seojin.stops.find((item) => item.chapter);

    expect(getDayNumber(vancouver, '2025-07-12')).toBe(15);
  });
});

describe('pickEditPhoto', () => {
  const photos = [
    photo('p1', '2025-07-12T09:00:00'),
    photo('p2', '2025-07-12T15:00:00'),
    photo('p3', '2025-07-13T09:00:00'),
  ];

  test('글에 붙은 사진이 지점에 있으면 그 첫 장이에요(그날 찍은 사진이 아니어도요)', () => {
    const post = { photoIds: ['p3', 'p2'] };

    expect(pickEditPhoto(post, photos, '2025-07-12').id).toBe('p3');
  });

  test('붙은 사진 중 지점에 없는 것은 건너뛰고 다음 것을 써요', () => {
    const post = { photoIds: ['없는-사진', 'p2'] };

    expect(pickEditPhoto(post, photos, '2025-07-12').id).toBe('p2');
  });

  test('붙은 사진이 없으면 그날 찍은 사진의 첫 장이에요', () => {
    expect(pickEditPhoto({ photoIds: [] }, photos, '2025-07-12').id).toBe('p1');
  });

  test('아직 없는 글(undefined)이어도 그날 찍은 사진을 써요', () => {
    expect(pickEditPhoto(undefined, photos, '2025-07-13').id).toBe('p3');
    expect(pickEditPhoto(null, photos, '2025-07-13').id).toBe('p3');
  });

  test('붙은 사진도 그날 찍은 사진도 없으면 null이에요(회색 칸)', () => {
    expect(pickEditPhoto({ photoIds: [] }, photos, '2025-07-20')).toBeNull();
    expect(pickEditPhoto({ photoIds: ['없는-사진'] }, [], '2025-07-12')).toBeNull();
  });

  test('seojin 밴쿠버: 07.12 글은 붙은 사진을, 사진이 없는 06.30 글은 null을 줘요', () => {
    const vancouver = seojin.stops.find((item) => item.chapter);
    const stopPhotos = selectStopPhotoDetails(vancouver, seojinSeed.photos);
    const postOf = (date) => seojinSeed.posts.find((item) => item.date === date);

    expect(pickEditPhoto(postOf('2025-07-12'), stopPhotos, '2025-07-12').fileName).toBe(
      'IMG_0188.JPG',
    );
    expect(pickEditPhoto(postOf('2025-06-30'), stopPhotos, '2025-06-30')).toBeNull();
  });
});

describe('formatPhotoCaption', () => {
  test('파일 이름 · 촬영 날짜와 시각 · 도시 이름 순서로 이어요', () => {
    const caption = formatPhotoCaption(
      photo('x', '2025-07-12T13:10:15', { fileName: 'IMG_0188.JPG' }),
      '밴쿠버',
    );

    expect(caption).toBe('IMG_0188.JPG · 2025.07.12 13:10 · 밴쿠버');
  });

  test('촬영 시각이 없으면 그 부분만 빼요', () => {
    const caption = formatPhotoCaption(photo('x', null, { fileName: 'IMG_0188.JPG' }), '밴쿠버');

    expect(caption).toBe('IMG_0188.JPG · 밴쿠버');
  });

  test('파일 이름이 없으면 그 부분만 빼요', () => {
    const caption = formatPhotoCaption(
      photo('x', '2025-07-12T13:10:15', { fileName: undefined }),
      '밴쿠버',
    );

    expect(caption).toBe('2025.07.12 13:10 · 밴쿠버');
  });

  test('도시 이름이 비어 있으면 그 부분만 빼요', () => {
    const caption = formatPhotoCaption(
      photo('x', '2025-07-12T13:10:15', { fileName: 'a.JPG' }),
      '',
    );

    expect(caption).toBe('a.JPG · 2025.07.12 13:10');
  });

  test('시간대가 붙은 시각이어도 현지 날짜와 시각을 그대로 보여요', () => {
    const caption = formatPhotoCaption(
      photo('x', '2025-12-31T23:40:00-08:00', { fileName: 'a.JPG' }),
      '밴쿠버',
    );

    expect(caption).toBe('a.JPG · 2025.12.31 23:40 · 밴쿠버');
  });
});
