import { describe, expect, test } from 'vitest';

import { findFirstTripOfPhotos, selectTripPage } from '@/utils/tripPager';

const trips = [
  { id: 'a', no: '01', name: '도쿄' },
  { id: 'b', no: '02', name: '방콕 · 다낭' },
  { id: 'c', no: '03', name: '캐나다 · 미국' },
];

describe('selectTripPage', () => {
  test('id로 고른 여행과 앞뒤 여행을 돌려줘요', () => {
    expect(selectTripPage(trips, 'b')).toEqual({
      current: trips[1],
      prev: trips[0],
      next: trips[2],
    });
  });

  test('첫 여행은 이전이 없고, 마지막 여행은 다음이 없어요', () => {
    expect(selectTripPage(trips, 'a').prev).toBeNull();
    expect(selectTripPage(trips, 'c').next).toBeNull();
  });

  test.each([null, undefined, '', 'nope'])('%s면 첫 여행이에요', (tripId) => {
    expect(selectTripPage(trips, tripId)).toEqual({
      current: trips[0],
      prev: null,
      next: trips[1],
    });
  });

  test('여행이 하나뿐이면 앞뒤가 없어요', () => {
    expect(selectTripPage([trips[0]], 'a')).toEqual({ current: trips[0], prev: null, next: null });
  });

  test('여행이 없으면 셋 다 null이에요', () => {
    expect(selectTripPage([], 'a')).toEqual({ current: null, prev: null, next: null });
  });
});

// 함수가 읽는 값(stops의 id·photoIds, trips의 id·stopIds)만 둔 Journey예요. trips는 시간 순서예요.
// 실제로는 지점·여행 id가 첫 사진 id지만, 무엇을 골랐는지 보기 쉽게 이름을 따로 붙였어요.
const journey = {
  stops: [
    { id: 'tokyo', photoIds: ['p1', 'p2'] },
    { id: 'osaka', photoIds: ['p3'] },
    { id: 'bangkok', photoIds: ['p4'] },
    { id: 'vancouver', photoIds: ['p5'] },
  ],
  trips: [
    { id: 'japan', stopIds: ['tokyo', 'osaka'] },
    { id: 'thailand', stopIds: ['bangkok'] },
    { id: 'canada', stopIds: ['vancouver'] },
  ],
  unlocated: ['p9'],
};

describe('findFirstTripOfPhotos', () => {
  test('새 사진만으로 생긴 여행을 골라요', () => {
    // given
    const newPhotoIds = ['p5'];

    // when
    const tripId = findFirstTripOfPhotos(journey, newPhotoIds);

    // then
    expect(tripId).toBe('canada');
  });

  test('기존 여행에 사진이 더해졌으면 그 여행을 골라요', () => {
    // given: 일본 여행에는 전에 저장한 p1, p2가 있어요
    const newPhotoIds = ['p3'];

    // when
    const tripId = findFirstTripOfPhotos(journey, newPhotoIds);

    // then
    expect(tripId).toBe('japan');
  });

  test('새 사진이 여러 여행에 걸치면 가장 이른 여행이에요', () => {
    // given: 늦은 여행의 사진을 앞에 둬서, 사진 순서가 아니라 여행 순서를 따르는지 봐요
    const newPhotoIds = ['p5', 'p4'];

    // when
    const tripId = findFirstTripOfPhotos(journey, newPhotoIds);

    // then
    expect(tripId).toBe('thailand');
  });

  test('새로 저장한 사진이 없으면(전부 이미 있음) null이에요', () => {
    // given
    const newPhotoIds = [];

    // when
    const tripId = findFirstTripOfPhotos(journey, newPhotoIds);

    // then
    expect(tripId).toBeNull();
  });

  test('위치 없는 사진만 저장했으면 여행이 없어서 null이에요', () => {
    // given: p9는 지점에 못 들어가 unlocated에만 있어요
    const newPhotoIds = ['p9'];

    // when
    const tripId = findFirstTripOfPhotos(journey, newPhotoIds);

    // then
    expect(tripId).toBeNull();
  });
});
