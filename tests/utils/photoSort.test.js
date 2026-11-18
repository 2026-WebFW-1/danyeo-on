import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { selectPhotoSummary, selectSortCounts, selectSortTrips } from '@/utils/photoSort';
import { selectTripStats } from '@/utils/trips';

const tripByName = (name) => seojin.trips.find((trip) => trip.name === name);
const stopOf = (id) => seojin.stops.find((stop) => stop.id === id);
const photoIdsOf = (trip) => trip.stopIds.flatMap((id) => stopOf(id).photoIds);
const rename = (anchorPhotoId, name) => ({ id: `c_${name}`, type: 'rename', anchorPhotoId, name });
const exclude = (photoId) => ({ id: `c_${photoId}`, type: 'exclude', photoId });

describe('selectSortTrips', () => {
  test('여행마다 번호 · 이름 · 기간 · 도시 칩 · 장수를 시간 순서대로 줘요', () => {
    const rows = selectSortTrips(seojin, [], seojinSeed.photos);
    const trip = tripByName('방콕 · 다낭');
    const row = rows.find((item) => item.id === trip.id);

    expect(rows).toHaveLength(seojin.trips.length);
    expect(rows[0].no).toBe('01');
    expect(row.name).toBe('방콕 · 다낭');
    expect(row.dateRange).toMatch(/^\d{4}\.\d{2}\.\d{2} — /);
    expect(row.cities.map((city) => city.city)).toEqual(['방콕', '다낭']);
    expect(row.cities[0].days).toBe(stopOf(trip.stopIds[0]).days);
    expect(row.photoCount).toBe(selectTripStats(seojin, trip.id).photos);
  });

  test('경유 지점은 도시 칩과 장수에서 빼요', () => {
    const trip = tripByName('방콕 · 다낭');
    const [first, second] = trip.stopIds;
    const journey = {
      ...seojin,
      stops: seojin.stops.map((stop) => (stop.id === second ? { ...stop, transit: true } : stop)),
    };

    const row = selectSortTrips(journey, [], []).find((item) => item.id === trip.id);

    expect(row.cities.map((city) => city.id)).toEqual([first]);
    expect(row.photoCount).toBe(stopOf(first).photoCount);
  });

  test('썸네일은 앞에서부터 3장이고, 사진을 못 받았으면 fileKey가 null이에요', () => {
    const trip = tripByName('방콕 · 다낭');
    const expectedIds = photoIdsOf(trip).slice(0, 3);
    const fileKeyOf = (id) => seojinSeed.photos.find((photo) => photo.id === id).fileKey;

    const withPhotos = selectSortTrips(seojin, [], seojinSeed.photos).find(
      (item) => item.id === trip.id,
    );
    const withoutPhotos = selectSortTrips(seojin, [], []).find((item) => item.id === trip.id);

    expect(withPhotos.thumbs).toEqual(expectedIds.map((id) => ({ id, fileKey: fileKeyOf(id) })));
    expect(withoutPhotos.thumbs).toEqual(expectedIds.map((id) => ({ id, fileKey: null })));
  });

  test('그 여행 사진에 걸린 마지막 rename으로 이름을 덮어요. 다른 여행의 rename은 상관없어요', () => {
    const bangkok = tripByName('방콕 · 다낭');
    const gangneung = tripByName('강릉');
    const corrections = [
      rename(photoIdsOf(bangkok).at(-1), '동남아'),
      rename(bangkok.id, '졸업 전 여행'),
      rename(gangneung.id, '바다'),
    ];

    const rows = selectSortTrips(seojin, corrections, []);

    expect(rows.find((item) => item.id === bangkok.id).name).toBe('졸업 전 여행');
    expect(rows.find((item) => item.id === gangneung.id).name).toBe('바다');
    expect(rows.find((item) => item.id === tripByName('도쿄').id).name).toBe('도쿄');
  });

  test('journey가 없으면 빈 배열이에요', () => {
    expect(selectSortTrips(null, [], [])).toEqual([]);
  });
});

describe('selectSortCounts', () => {
  test('여행 · 위치 확인 필요 · 제외한 사진 수를 세요', () => {
    expect(selectSortCounts(seojin, [])).toEqual({
      trips: seojin.trips.length,
      unlocated: seojin.unlocated.length,
      excluded: seojin.excluded.length,
    });
  });

  test('뺀 사진은 보정 목록으로 덮어 세고, 위치 확인 필요에서도 빼요. 같은 사진은 한 번만 세요', () => {
    const journey = { ...seojin, unlocated: ['p_a', 'p_b'], excluded: ['p_x'] };
    const corrections = [exclude('p_a'), exclude('p_x'), exclude('p_y')];

    expect(selectSortCounts(journey, corrections)).toEqual({
      trips: seojin.trips.length,
      unlocated: 1,
      excluded: 3,
    });
  });

  test('journey가 없으면 모두 0이에요', () => {
    expect(selectSortCounts(null, [])).toEqual({ trips: 0, unlocated: 0, excluded: 0 });
  });
});

describe('selectPhotoSummary', () => {
  test('좌표가 있는 사진과 없는 사진을 나눠 세요', () => {
    const photos = [
      { id: 'a', lat: 37.5, lng: 127 },
      { id: 'b', lat: 0, lng: 0 },
      { id: 'c', lat: null, lng: null },
    ];

    expect(selectPhotoSummary(photos)).toEqual({ total: 3, located: 2, unlocated: 1 });
    expect(selectPhotoSummary([])).toEqual({ total: 0, located: 0, unlocated: 0 });
  });
});
