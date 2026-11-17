import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import {
  buildTripExcludeInputs,
  selectExcludedIds,
  selectExcludedPhotos,
  selectPhotoSummary,
  selectSortCounts,
  selectSortTrips,
  selectUnlocatedGroups,
} from '@/utils/photoSort';
import { selectTripStats } from '@/utils/trips';

const tripByName = (name) => seojin.trips.find((trip) => trip.name === name);
const stopOf = (id) => seojin.stops.find((stop) => stop.id === id);
const photoIdsOf = (trip) => trip.stopIds.flatMap((id) => stopOf(id).photoIds);
const rename = (anchorPhotoId, name) => ({ id: `c_${name}`, type: 'rename', anchorPhotoId, name });
const exclude = (photoId, id = `c_${photoId}`) => ({ id, type: 'exclude', photoId });
const NONE = new Set();

describe('selectSortTrips', () => {
  test('여행마다 번호 · 이름 · 기간 · 도시 칩 · 장수를 시간 순서대로 줘요', () => {
    const rows = selectSortTrips(seojin, [], seojinSeed.photos, NONE);
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

    const row = selectSortTrips(journey, [], [], NONE).find((item) => item.id === trip.id);

    expect(row.cities.map((city) => city.id)).toEqual([first]);
    expect(row.photoCount).toBe(stopOf(first).photoCount);
  });

  test('썸네일은 앞에서부터 3장이고, 사진을 못 받았으면 fileKey가 null이에요', () => {
    const trip = tripByName('방콕 · 다낭');
    const expectedIds = photoIdsOf(trip).slice(0, 3);
    const fileKeyOf = (id) => seojinSeed.photos.find((photo) => photo.id === id).fileKey;

    const withPhotos = selectSortTrips(seojin, [], seojinSeed.photos, NONE).find(
      (item) => item.id === trip.id,
    );
    const withoutPhotos = selectSortTrips(seojin, [], [], NONE).find((item) => item.id === trip.id);

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

    const rows = selectSortTrips(seojin, corrections, [], NONE);

    expect(rows.find((item) => item.id === bangkok.id).name).toBe('졸업 전 여행');
    expect(rows.find((item) => item.id === gangneung.id).name).toBe('바다');
    expect(rows.find((item) => item.id === tripByName('도쿄').id).name).toBe('도쿄');
  });

  test('journey가 없으면 빈 배열이에요', () => {
    expect(selectSortTrips(null, [], [], NONE)).toEqual([]);
  });
});

describe('selectSortCounts', () => {
  test('여행 · 위치 확인 필요 · 제외한 사진 수를 세요', () => {
    const trips = selectSortTrips(seojin, [], [], NONE);

    expect(selectSortCounts(seojin, trips, new Set(seojin.excluded))).toEqual({
      trips: seojin.trips.length,
      unlocated: seojin.unlocated.length,
      excluded: seojin.excluded.length,
    });
  });

  test('뺀 사진은 위치 확인 필요에서 빼요', () => {
    const journey = { ...seojin, unlocated: ['p_a', 'p_b'] };

    expect(selectSortCounts(journey, [], new Set(['p_a', 'p_y']))).toEqual({
      trips: 0,
      unlocated: 1,
      excluded: 2,
    });
  });

  test('journey가 없으면 모두 0이에요', () => {
    expect(selectSortCounts(null, [], NONE)).toEqual({ trips: 0, unlocated: 0, excluded: 0 });
  });
});

describe('selectExcludedIds', () => {
  test('보정을 다 불러왔으면 exclude 보정이 기준이라, 복구한 사진은 Journey에 남아 있어도 빠져요', () => {
    const journey = { ...seojin, excluded: ['p_restored', 'p_kept'] };

    expect(
      selectExcludedIds(journey, [exclude('p_kept'), exclude('p_new'), exclude('p_new', 'c_2')]),
    ).toEqual(new Set(['p_kept', 'p_new']));
  });

  test('불러오기 전(null)에는 Journey의 값이에요', () => {
    expect(selectExcludedIds({ ...seojin, excluded: ['p_x'] }, null)).toEqual(new Set(['p_x']));
    expect(selectExcludedIds(null, null)).toEqual(new Set());
  });
});

describe('selectSortTrips 뺀 사진', () => {
  test('뺀 사진은 썸네일 · 장수 · 펼칠 사진에서 빠져요', () => {
    const trip = tripByName('방콕 · 다낭');
    const [firstPhoto, ...rest] = photoIdsOf(trip);

    const row = selectSortTrips(seojin, [], [], new Set([firstPhoto])).find(
      (item) => item.id === trip.id,
    );

    expect(row.thumbs[0].id).toBe(rest[0]);
    expect(row.photos.map((photo) => photo.id)).toEqual(rest);
    expect(row.photoCount).toBe(selectTripStats(seojin, trip.id).photos - 1);
  });

  test('사진을 모두 뺀 지점은 도시 칩에서, 모두 뺀 여행은 표에서 빠지고 번호를 다시 매겨요', () => {
    const bangkok = tripByName('방콕 · 다낭');
    const [bangkokStop, danangStop] = bangkok.stopIds.map(stopOf);
    const gangneung = tripByName('강릉');
    const excludedIds = new Set([...bangkokStop.photoIds, ...photoIdsOf(gangneung)]);

    const rows = selectSortTrips(seojin, [], [], excludedIds);

    expect(rows.find((row) => row.id === bangkok.id).cities.map((city) => city.id)).toEqual([
      danangStop.id,
    ]);
    expect(rows).toHaveLength(seojin.trips.length - 1);
    expect(rows.some((row) => row.id === gangneung.id)).toBe(false);
    expect(rows.map((row) => row.no).slice(0, 2)).toEqual(['01', '02']);
    expect(rows[1].id).toBe(seojin.trips[2].id);
  });
});

describe('selectExcludedPhotos', () => {
  test('최근에 뺀 사진이 앞이고, 같은 사진의 exclude는 하나로 묶어요', () => {
    const [a, b] = seojinSeed.photos;
    const corrections = [
      exclude(a.id, 'c_1'),
      rename(a.id, '이름'),
      exclude(b.id, 'c_2'),
      exclude(a.id, 'c_3'),
    ];

    expect(selectExcludedPhotos(corrections, seojinSeed.photos)).toEqual([
      { id: a.id, fileKey: a.fileKey, takenAt: a.takenAt, correctionIds: ['c_3', 'c_1'] },
      { id: b.id, fileKey: b.fileKey, takenAt: b.takenAt, correctionIds: ['c_2'] },
    ]);
  });

  test('사진을 못 받았으면 fileKey · takenAt이 null이에요', () => {
    expect(selectExcludedPhotos([exclude('p_gone')], [])).toEqual([
      { id: 'p_gone', fileKey: null, takenAt: null, correctionIds: ['c_p_gone'] },
    ]);
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

describe('selectUnlocatedGroups', () => {
  const photo = (id, takenAt) => ({ id, takenAt, fileKey: `public:/photos/${id}.webp` });
  const photos = [
    photo('p_b2', '2025-01-04T18:00:00'),
    photo('p_a', '2024-12-31T23:59:00'),
    photo('p_b1', '2025-01-04T09:00:00'),
    photo('p_none', null),
  ];
  const journey = (unlocated) => ({ ...seojin, unlocated });

  test('찍은 날짜 순서로 묶고, 묶음 안은 찍은 순서예요. 날짜 없는 사진은 맨 뒤예요', () => {
    const groups = selectUnlocatedGroups(journey(['p_none', 'p_b2', 'p_a', 'p_b1']), photos, NONE);

    expect(groups.map((group) => [group.key, group.date])).toEqual([
      ['2024-12-31', '2024.12.31'],
      ['2025-01-04', '2025.01.04'],
      ['none', null],
    ]);
    expect(groups[1].photos).toEqual([
      { id: 'p_b1', fileKey: 'public:/photos/p_b1.webp' },
      { id: 'p_b2', fileKey: 'public:/photos/p_b2.webp' },
    ]);
  });

  test('뺀 사진은 빠지고, 다 빠진 묶음은 없어요. 못 받은 사진은 날짜 없음이에요', () => {
    const groups = selectUnlocatedGroups(
      journey(['p_a', 'p_b1', 'p_unknown']),
      photos,
      new Set(['p_a']),
    );

    expect(groups.map((group) => group.key)).toEqual(['2025-01-04', 'none']);
    expect(groups[1].photos).toEqual([{ id: 'p_unknown', fileKey: null }]);
  });

  test('journey가 없으면 빈 배열이에요', () => {
    expect(selectUnlocatedGroups(null, photos, NONE)).toEqual([]);
  });
});

describe('buildTripExcludeInputs', () => {
  const bangkok = tripByName('방콕 · 다낭');
  const [anchor, second, third] = photoIdsOf(bangkok);
  const rowWith = (corrections, excludedIds = NONE) =>
    selectSortTrips(seojin, corrections, [], excludedIds).find((row) => row.id === bangkok.id);

  test('자동 이름이거나 기준 사진이 아니면 빼기만 해요', () => {
    expect(buildTripExcludeInputs(rowWith([]), anchor)).toEqual([
      { type: 'exclude', photoId: anchor },
    ]);
    expect(buildTripExcludeInputs(rowWith([rename(anchor, '졸업 전 여행')]), second)).toEqual([
      { type: 'exclude', photoId: second },
    ]);
  });

  test('이름을 정한 기준 사진을 빼면, 남은 첫 사진으로 같은 이름을 먼저 걸어요', () => {
    expect(buildTripExcludeInputs(rowWith([rename(anchor, '졸업 전 여행')]), anchor)).toEqual([
      { type: 'rename', anchorPhotoId: second, name: '졸업 전 여행' },
      { type: 'exclude', photoId: anchor },
    ]);
  });

  test('이미 뺀 사진으로는 옮기지 않아요', () => {
    const row = rowWith([rename(anchor, '졸업 전 여행')], new Set([second]));

    expect(buildTripExcludeInputs(row, anchor)[0]).toEqual({
      type: 'rename',
      anchorPhotoId: third,
      name: '졸업 전 여행',
    });
  });

  test('남은 사진이 없으면 빼기만 해요', () => {
    const lastOnly = {
      ...rowWith([]),
      renameAnchorId: anchor,
      photos: [{ id: anchor, fileKey: null }],
    };

    expect(buildTripExcludeInputs(lastOnly, anchor)).toEqual([
      { type: 'exclude', photoId: anchor },
    ]);
  });
});
