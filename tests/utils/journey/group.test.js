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
});
