import { describe, expect, test } from 'vitest';

import edgeGroup from '@/data/fixtures/edge.group.json';
import emptyGroup from '@/data/fixtures/empty.group.json';
import seojinGroup from '@/data/fixtures/seojin.group.json';
import edgeSeed from '@/data/seed/edge.json';
import emptySeed from '@/data/seed/empty.json';
import seojinSeed from '@/data/seed/seojin.json';
import { group } from '@/utils/journey/group';

/** 이름 붙이기(place·autoName)는 buildJourney 몫이고, personaId 등은 설명용이라 비교에서 빼요. */
function toExpected(fixture) {
  const omit = (item, key) => {
    const { [key]: _omitted, ...rest } = item;
    return rest;
  };
  return {
    home: fixture.home,
    stops: fixture.stops.map((stop) => omit(stop, 'place')),
    trips: fixture.trips.map((trip) => omit(trip, 'autoName')),
    unlocated: fixture.unlocated,
  };
}

/** 사진이 들어 있는 지점을 찾아요. */
function findStopOf(result, photoId) {
  return result.stops.find((stop) => stop.photoIds.includes(photoId));
}

/** 지점이 들어 있는 여행을 찾아요. */
function findTripOf(result, stopId) {
  return result.trips.find((trip) => trip.stopIds.includes(stopId));
}

/** 같은 곳(서울)에서 찍은 사진 한 장을 만들어요. 시각만 바꿔 가며 써요. */
function makePhoto(id, takenAt, offset) {
  return { id, takenAt, offset, lat: 37.5, lng: 127 };
}

describe('group', () => {
  test.each([
    ['seojin', seojinSeed, seojinGroup],
    ['edge', edgeSeed, edgeGroup],
    ['empty', emptySeed, emptyGroup],
  ])('%s의 seed 사진을 묶으면 group.json과 같아요', (_, seed, fixture) => {
    // given
    const photos = seed.photos;

    // when
    const result = group(photos);

    // then
    expect(result).toEqual(toExpected(fixture));
  });

  test('빈 배열이면 아무것도 없어요', () => {
    // given
    const photos = [];

    // when
    const result = group(photos);

    // then
    expect(result).toEqual({ home: null, stops: [], trips: [], unlocated: [] });
  });

  test('받은 사진 배열을 바꾸지 않아요', () => {
    // given: 시각 순이 아닌 사진 배열
    const photos = [...edgeSeed.photos];

    // when
    group(photos);

    // then: 안에서 정렬해도 원본 순서는 그대로
    expect(photos).toEqual(edgeSeed.photos);
  });

  test('시간대가 없는 사진은 +09:00으로 봐요', () => {
    // given: 10:00(시간대 없음)과 02:00 +00:00
    // 10:00을 +09:00으로 보면 UTC 01:00이라 앞이고, UTC로 보면 뒤로 가요.
    const photos = [
      makePhoto('later', '2025-01-01T02:00:00', '+00:00'),
      makePhoto('earlier', '2025-01-01T10:00:00', null),
    ];

    // when
    const result = group(photos);

    // then
    expect(result.stops[0].photoIds).toEqual(['earlier', 'later']);
  });

  test('날짜변경선 양쪽에서 찍은 가까운 사진은 한 지점이고, 중심도 그 근처예요', () => {
    // given: 피지 근처(위도 -16.5) 경도 179.9 · -179.9 · 179.9, 서로 약 21km
    const photo = (id, takenAt, lng) => ({ id, takenAt, offset: '+12:00', lat: -16.5, lng });
    const photos = [
      photo('a', '2025-01-01T10:00:00', 179.9),
      photo('b', '2025-01-01T11:00:00', -179.9),
      photo('c', '2025-01-01T12:00:00', 179.9),
    ];

    // when
    const result = group(photos);

    // then: 경도를 그냥 평균 내면 0(지구 반대편)이 돼서 c가 떨어져 나가요.
    expect(result.stops).toHaveLength(1);
    expect(Math.abs(result.stops[0].lng)).toBeGreaterThan(179);
  });

  test('자정 무렵 시간대를 넘어 현지 날짜가 거꾸로 가도 머문 날은 1일 이상이에요', () => {
    // given: 00:10 +01:00(= UTC 23:10)을 찍고 10분 뒤 23:20 +00:00을 찍음
    // 실제 순서로는 01-02 → 01-01이라 끝 날짜가 시작 날짜보다 앞서요.
    const photo = (id, takenAt, offset) => ({ id, takenAt, offset, lat: 51.5, lng: 0 });
    const photos = [
      photo('first', '2025-01-02T00:10:00', '+01:00'),
      photo('second', '2025-01-01T23:20:00', '+00:00'),
    ];

    // when
    const result = group(photos);

    // then: 현지 날짜 1일과 2일에 걸쳐 있으니 2일
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].days).toBe(2);
  });

  describe('edge의 경계 케이스', () => {
    test('시계가 초기화된 2000년 사진도 시각 순서대로 맨 앞 지점이 돼요', () => {
      // given: 배터리가 나가 2000-01-01로 찍힌 사진(p_3e527e)이 섞인 사진
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then
      expect(result.stops[0].photoIds).toEqual(['p_3e527e']);
    });

    test('18일 비고 집 사진이 없어도 14일을 넘었으니 여행이 둘로 끊겨요', () => {
      // given: 방콕 마지막 사진(p_3e3110 지점) 뒤 18일 동안 사진이 없다가 다른 곳(p_6e3edd)
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then
      const before = findTripOf(result, findStopOf(result, 'p_3e3110').id);
      const after = findTripOf(result, findStopOf(result, 'p_6e3edd').id);
      expect(after).not.toBe(before);
    });

    test('18일 비었지만 21일 미만이면 같은 지점이고, 25일 머물러 챕터예요', () => {
      // given: 런던 8/1·8/3·8/21·8/25, 8/3과 8/21 사이가 18일
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then
      const stop = findStopOf(result, 'p_6936a2');
      expect(stop.days).toBe(25);
      expect(stop.chapter).toBe(true);
    });

    test('14일째면 챕터, 13일째면 챕터가 아니에요', () => {
      // given: 정확히 14일 머문 곳(p_7d74cb)과 13일 머문 곳(p_5c38af)
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then
      expect(findStopOf(result, 'p_7d74cb')).toMatchObject({ days: 14, chapter: true });
      expect(findStopOf(result, 'p_5c38af')).toMatchObject({ days: 13, chapter: false });
    });

    test('나라가 달라도 60km 안이면 같은 지점이에요', () => {
      // given: 싱가포르 지점에서 60km 안이지만 나라가 다른 사진(p_a85ab2)
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then: 혼자 떨어지지 않고 다른 사진과 같은 지점
      expect(findStopOf(result, 'p_a85ab2').photoIds.length).toBeGreaterThan(1);
    });

    test('같은 도시에 다시 오면 새 지점이에요', () => {
      // given: 토론토 → 나이아가라 → 토론토(p_02d3c9)
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then: 처음 토론토 지점에 붙지 않고 p_02d3c9부터 새 지점
      expect(findStopOf(result, 'p_02d3c9').photoIds[0]).toBe('p_02d3c9');
    });

    test('위치가 없는 사진은 unlocated예요', () => {
      // given: GPS가 없는 날 찍은 사진(p_6a6b8f)
      const photos = edgeSeed.photos;

      // when
      const result = group(photos);

      // then
      expect(result.unlocated).toContain('p_6a6b8f');
      expect(findStopOf(result, 'p_6a6b8f')).toBeUndefined();
    });
  });

  describe('위치 없는 사진을 앞뒤 사진의 시간으로 채우기', () => {
    /** 시각만 있고 위치(GPS)가 없는 사진이에요. */
    const makeNoGpsPhoto = (id, takenAt) => ({
      id,
      takenAt,
      offset: '+09:00',
      lat: null,
      lng: null,
    });
    /** 서울에서 약 325km 떨어진 부산에서 찍은 사진이에요. */
    const makeBusanPhoto = (id, takenAt) => ({
      id,
      takenAt,
      offset: '+09:00',
      lat: 35.1,
      lng: 129,
    });

    test('앞뒤 사진이 같은 지점이면 그 지점에 시각 순으로 들어가고, 지점의 중심·기간은 그대로예요', () => {
      // given: 서울 10:00 · 위치 없음 12:00 · 서울 14:00
      const located = [
        makePhoto('a', '2025-01-01T10:00:00', '+09:00'),
        makePhoto('c', '2025-01-01T14:00:00', '+09:00'),
      ];
      const photos = [...located, makeNoGpsPhoto('b', '2025-01-01T12:00:00')];

      // when
      const result = group(photos);

      // then
      const withoutFill = group(located);
      expect(result.stops).toEqual([{ ...withoutFill.stops[0], photoIds: ['a', 'b', 'c'] }]);
      expect(result.trips).toEqual(withoutFill.trips);
      expect(result.unlocated).toEqual([]);
    });

    test('앞뒤 사진이 다른 지점이면 unlocated에 남아요', () => {
      // given: 서울 10:00 · 위치 없음 11:00 · 부산 12:00
      const photos = [
        makePhoto('seoul', '2025-01-01T10:00:00', '+09:00'),
        makeNoGpsPhoto('moving', '2025-01-01T11:00:00'),
        makeBusanPhoto('busan', '2025-01-01T12:00:00'),
      ];

      // when
      const result = group(photos);

      // then
      expect(result.unlocated).toEqual(['moving']);
      expect(findStopOf(result, 'moving')).toBeUndefined();
    });

    test('위치 있는 사진과 같은 시각이면 그 사진의 지점에 들어가고, 지점의 첫 사진은 위치 있는 사진이에요', () => {
      // given: 서울 지점은 10:00에 끝나고 부산 지점은 11:00에 시작. 위치 없는 사진도 11:00
      const photos = [
        makePhoto('seoul', '2025-01-01T10:00:00', '+09:00'),
        makeNoGpsPhoto('sameTime', '2025-01-01T11:00:00'),
        makeBusanPhoto('busan', '2025-01-01T11:00:00'),
        makeBusanPhoto('busanLater', '2025-01-01T12:00:00'),
      ];

      // when
      const result = group(photos);

      // then
      const busanStop = findStopOf(result, 'busan');
      expect(busanStop.id).toBe('busan');
      expect(busanStop.photoIds).toEqual(['busan', 'sameTime', 'busanLater']);
      expect(result.unlocated).toEqual([]);
    });

    test('여러 지점에 여러 장을 뒤섞어 받아도 각 지점에 시각 순으로 들어가요', () => {
      // given: 서울 01-01 10:00~14:00, 부산 01-02 10:00~14:00. 위치 없는 사진은 지점마다 2장씩 섞어서 받음
      const photos = [
        makeNoGpsPhoto('busanLate', '2025-01-02T13:00:00'),
        makePhoto('seoulStart', '2025-01-01T10:00:00', '+09:00'),
        makeNoGpsPhoto('seoulLate', '2025-01-01T13:00:00'),
        makeBusanPhoto('busanStart', '2025-01-02T10:00:00'),
        makeNoGpsPhoto('seoulEarly', '2025-01-01T11:00:00'),
        makePhoto('seoulEnd', '2025-01-01T14:00:00', '+09:00'),
        makeNoGpsPhoto('busanEarly', '2025-01-02T11:00:00'),
        makeBusanPhoto('busanEnd', '2025-01-02T14:00:00'),
      ];

      // when
      const result = group(photos);

      // then
      expect(result.stops.map((stop) => stop.photoIds)).toEqual([
        ['seoulStart', 'seoulEarly', 'seoulLate', 'seoulEnd'],
        ['busanStart', 'busanEarly', 'busanLate', 'busanEnd'],
      ]);
      expect(result.unlocated).toEqual([]);
    });

    test.each([
      ['앞뒤 사진과 딱 12시간이면 들어가요', '2025-01-01T12:00:00', []],
      ['앞 사진과 12시간 넘게 떨어지면 unlocated예요', '2025-01-01T12:00:01', ['b']],
      ['뒤 사진과 12시간 넘게 떨어지면 unlocated예요', '2025-01-01T11:59:59', ['b']],
    ])('%s', (_, takenAt, expectedUnlocated) => {
      // given: 서울 01-01 00:00 · 위치 없음 · 서울 01-02 00:00 (24시간 사이라 같은 지점)
      const photos = [
        makePhoto('a', '2025-01-01T00:00:00', '+09:00'),
        makeNoGpsPhoto('b', takenAt),
        makePhoto('c', '2025-01-02T00:00:00', '+09:00'),
      ];

      // when
      const result = group(photos);

      // then
      expect(result.stops).toHaveLength(1);
      expect(result.unlocated).toEqual(expectedUnlocated);
    });

    test('맨 앞·맨 뒤 사진과 시각 없는 사진은 받은 순서대로 unlocated에 남아요', () => {
      // given: 서울 10:00 · 11:00 사이에는 없고, 그 앞(09:00)과 뒤(12:00), 시각 없는 사진
      const photos = [
        makeNoGpsPhoto('last', '2025-01-01T12:00:00'),
        makePhoto('a', '2025-01-01T10:00:00', '+09:00'),
        { id: 'noTime', takenAt: null, offset: null, lat: null, lng: null },
        makePhoto('c', '2025-01-01T11:00:00', '+09:00'),
        makeNoGpsPhoto('first', '2025-01-01T09:00:00'),
      ];

      // when
      const result = group(photos);

      // then
      expect(result.unlocated).toEqual(['last', 'noTime', 'first']);
      expect(result.stops[0].photoIds).toEqual(['a', 'c']);
    });
  });

  describe('나누는 시각(split)으로 여행 나누기', () => {
    /** 사진의 실제 시각(밀리초)이에요. buildJourney가 split 보정의 사진으로 이 값을 넘겨요. */
    const toMs = (takenAt) => Date.parse(`${takenAt}+09:00`);
    const makeNoGpsPhoto = (id, takenAt) => ({
      id,
      takenAt,
      offset: '+09:00',
      lat: null,
      lng: null,
    });
    const makeBusanPhoto = (id, takenAt) => ({
      id,
      takenAt,
      offset: '+09:00',
      lat: 35.1,
      lng: 129,
    });

    test('같은 지점 안의 사진 앞에서 나누면 지점과 여행이 둘로 나뉘고, 머문 날도 따로 세요', () => {
      // given: 서울 01-01 · 01-02 · 01-03, 01-02 사진 앞에서 나누기
      const photos = [
        makePhoto('a', '2025-01-01T10:00:00', '+09:00'),
        makePhoto('b', '2025-01-02T10:00:00', '+09:00'),
        makePhoto('c', '2025-01-03T10:00:00', '+09:00'),
      ];
      const splitAts = [toMs('2025-01-02T10:00:00')];

      // when
      const result = group(photos, splitAts);

      // then
      expect(result.stops.map((stop) => [stop.id, stop.photoIds, stop.days])).toEqual([
        ['a', ['a'], 1],
        ['b', ['b', 'c'], 2],
      ]);
      expect(result.trips.map((trip) => trip.stopIds)).toEqual([['a'], ['b']]);
    });

    test('지점 사이에서 나누면 지점은 그대로이고 여행만 끊겨요', () => {
      // given: 집(제주, 사진이 가장 많음)을 떠나 서울 10:00 → 부산 12:00, 부산 사진 앞에서 나누기
      const homePhotos = ['h1', 'h2', 'h3'].map((id) => ({
        id,
        takenAt: '2024-12-20T10:00:00',
        offset: '+09:00',
        lat: 33.5,
        lng: 126.5,
      }));
      const photos = [
        ...homePhotos,
        makePhoto('seoul', '2025-01-01T10:00:00', '+09:00'),
        makeBusanPhoto('busan', '2025-01-01T12:00:00'),
      ];
      const splitAts = [toMs('2025-01-01T12:00:00')];

      // when
      const result = group(photos, splitAts);

      // then
      expect(result.stops).toEqual(group(photos).stops);
      expect(result.trips.map((trip) => trip.stopIds)).toEqual([['seoul'], ['busan']]);
      expect(result.trips.every((trip) => trip.legs.length === 0)).toBe(true);
    });

    test.each([
      [
        '위치 있는 사진 앞에서 나누면 그 사이 위치 없는 사진은 앞 지점에 남아요',
        'c',
        ['a', 'b'],
        ['c'],
      ],
      ['위치 없는 사진 앞에서 나누면 그 사진부터 뒤 지점이에요', 'b', ['a'], ['b', 'c']],
    ])('%s', (_, splitPhotoId, expectedBefore, expectedAfter) => {
      // given: 서울 10:00 · 위치 없음 11:00 · 서울 12:00
      const photos = [
        makePhoto('a', '2025-01-01T10:00:00', '+09:00'),
        makeNoGpsPhoto('b', '2025-01-01T11:00:00'),
        makePhoto('c', '2025-01-01T12:00:00', '+09:00'),
      ];
      const splitAts = [toMs(photos.find((photo) => photo.id === splitPhotoId).takenAt)];

      // when
      const result = group(photos, splitAts);

      // then
      expect(result.stops.map((stop) => stop.photoIds)).toEqual([expectedBefore, expectedAfter]);
      expect(result.trips).toHaveLength(2);
      expect(result.unlocated).toEqual([]);
    });

    test('지점 사이에서 나누면 그 사이 위치 없는 사진은 지금처럼 unlocated예요', () => {
      // given: 서울 10:00 · 위치 없음 11:00 · 부산 12:00, 부산 사진 앞에서 나누기
      const photos = [
        makePhoto('seoul', '2025-01-01T10:00:00', '+09:00'),
        makeNoGpsPhoto('moving', '2025-01-01T11:00:00'),
        makeBusanPhoto('busan', '2025-01-01T12:00:00'),
      ];
      const splitAts = [toMs('2025-01-01T12:00:00')];

      // when
      const result = group(photos, splitAts);

      // then
      expect(result.unlocated).toEqual(['moving']);
    });

    test.each([
      ['첫 사진', '2025-01-01T10:00:00'],
      ['마지막 사진 뒤', '2025-01-05T10:00:00'],
    ])('나누는 시각이 %s이면 아무것도 바뀌지 않아요', (_, takenAt) => {
      // given: 서울 01-01 · 01-02
      const photos = [
        makePhoto('a', '2025-01-01T10:00:00', '+09:00'),
        makePhoto('b', '2025-01-02T10:00:00', '+09:00'),
      ];
      const splitAts = [toMs(takenAt)];

      // when
      const result = group(photos, splitAts);

      // then
      expect(result).toEqual(group(photos));
    });
  });
});
