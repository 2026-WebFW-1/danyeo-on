import { describe, expect, test, vi } from 'vitest';

import edgeGroup from '@/data/fixtures/edge.group.json';
import edgeJourney from '@/data/fixtures/edge.journey.json';
import emptyGroup from '@/data/fixtures/empty.group.json';
import emptyJourney from '@/data/fixtures/empty.journey.json';
import seojinGroup from '@/data/fixtures/seojin.group.json';
import seojinJourney from '@/data/fixtures/seojin.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import emptySeed from '@/data/seed/empty.json';
import seojinSeed from '@/data/seed/seojin.json';
import { calcDistanceKm } from '@/utils/distance';
import { buildJourney } from '@/utils/journey/buildJourney';
import { selectSortTrips } from '@/utils/photoSort';
import { selectPassportCalendar } from '@/utils/passportCalendar';
import { selectPassportStats } from '@/utils/passportStats';
import { selectPassportStamps } from '@/utils/passportStamps';
import { selectPassportRecords } from '@/utils/passportRecords';

/**
 * personaId·generatedBy·about은 설명용이라 비교에서 빼요.
 * coverFileKey도 빼요. #95에서 seed 사진에 demo: 키가 붙었는데 journey.json은 그 전 값이라서요.
 * 대표 사진 규칙은 아래 테스트에서 따로 봐요.
 */
function withoutCover(journey) {
  const { personaId: _personaId, generatedBy: _generatedBy, about: _about, ...rest } = journey;
  return {
    ...rest,
    stops: rest.stops.map((stop) => {
      const { coverFileKey: _coverFileKey, ...other } = stop;
      return other;
    }),
  };
}

/**
 * reverseCity 대신 group.json의 place로 이름을 찾아요.
 * 사진을 빼면 지점 중심이 조금 옮겨서, 좌표가 딱 같은 곳 대신 가장 가까운 지점의 이름을 써요.
 */
function makeFindPlace(groupFixture) {
  return (lat, lng) =>
    groupFixture.stops.reduce((nearest, stop) =>
      calcDistanceKm({ lat, lng }, stop) < calcDistanceKm({ lat, lng }, nearest) ? stop : nearest,
    ).place;
}

describe('buildJourney', () => {
  test.each([
    ['seojin', seojinSeed, seojinGroup, seojinJourney],
    ['edge', edgeSeed, edgeGroup, edgeJourney],
    ['empty', emptySeed, emptyGroup, emptyJourney],
  ])(
    '%s의 seed 사진과 보정으로 만들면 journey.json과 같아요',
    async (_, seed, groupFixture, fixture) => {
      // given
      const findPlace = makeFindPlace(groupFixture);

      // when
      const journey = await buildJourney(seed.photos, seed.corrections, findPlace);

      // then
      expect(withoutCover(journey)).toEqual(withoutCover(fixture));
    },
  );

  test('대표 사진은 이미지가 있는 첫 사진이에요', async () => {
    // given: 첫 사진은 이미지가 없고 둘째 사진부터 있어요
    const photos = [
      {
        id: 'p_1',
        takenAt: '2024-01-01T10:00:00',
        offset: '+09:00',
        lat: 37.5,
        lng: 127,
        fileKey: null,
      },
      {
        id: 'p_2',
        takenAt: '2024-01-01T11:00:00',
        offset: '+09:00',
        lat: 37.5,
        lng: 127,
        fileKey: 'public:/a.webp',
      },
      {
        id: 'p_3',
        takenAt: '2024-01-01T12:00:00',
        offset: '+09:00',
        lat: 37.5,
        lng: 127,
        fileKey: 'public:/b.webp',
      },
    ];
    const findPlace = () => ({ city: '서울', country: '한국', cc: 'KR' });

    // when
    const journey = await buildJourney(photos, [], findPlace);

    // then: 지역이 하나뿐이라 집이 없어서, 이 지점이 여행 지점으로 남아요
    expect(journey.stops[0].coverFileKey).toBe('public:/a.webp');
  });

  test('경유로 고친 지점은 선에서 빠지고 사진은 남아요', async () => {
    // given
    const transitPhotoId = edgeSeed.corrections.find((c) => c.type === 'transit').photoIds[0];

    // when
    const journey = await buildJourney(
      edgeSeed.photos,
      edgeSeed.corrections,
      makeFindPlace(edgeGroup),
    );

    // then
    const transitStop = journey.stops.find((stop) => stop.photoIds.includes(transitPhotoId));
    expect(transitStop.transit).toBe(true);
    expect(
      journey.legs.some((leg) => leg.from === transitStop.id || leg.to === transitStop.id),
    ).toBe(false);
  });

  test('뺀 사진은 지점에 없고 excluded에 들어가요', async () => {
    // given
    const excludedId = edgeSeed.corrections.find((c) => c.type === 'exclude').photoId;

    // when
    const journey = await buildJourney(
      edgeSeed.photos,
      edgeSeed.corrections,
      makeFindPlace(edgeGroup),
    );

    // then
    expect(journey.excluded).toEqual([excludedId]);
    expect(journey.stops.some((stop) => stop.photoIds.includes(excludedId))).toBe(false);
  });

  test('같은 구간을 두 번 고치면 마지막 이동 수단을 써요', async () => {
    // given
    const modeCorrection = seojinSeed.corrections.find((c) => c.type === 'mode');
    const corrections = [
      ...seojinSeed.corrections,
      { ...modeCorrection, id: 'c_later', mode: 'train' },
    ];

    // when
    const journey = await buildJourney(seojinSeed.photos, corrections, makeFindPlace(seojinGroup));

    // then
    const userLegs = journey.legs.filter((leg) => leg.modeSource === 'user');
    expect(userLegs).toHaveLength(1);
    expect(userLegs[0].mode).toBe('train');
  });

  test('날짜변경선을 넘는 구간을 표시해요', async () => {
    // when
    const journey = await buildJourney(
      seojinSeed.photos,
      seojinSeed.corrections,
      makeFindPlace(seojinGroup),
    );

    // then
    const crossing = journey.legs.filter((leg) => leg.crossesAntimeridian);
    expect(crossing.length).toBeGreaterThan(0);
    crossing.forEach((leg) =>
      expect(Math.abs(leg.toLatLng[1] - leg.fromLatLng[1])).toBeGreaterThan(180),
    );
  });
});

/** 작은 데이터로 규칙 하나씩 보는 테스트에서 쓰는 도시예요. */
const CITIES = {
  seoul: { lat: 37.5, lng: 127, offset: '+09:00', city: '서울', country: '한국', cc: 'KR' },
  bangkok: { lat: 13.75, lng: 100.5, offset: '+07:00', city: '방콕', country: '태국', cc: 'TH' },
  danang: { lat: 16.05, lng: 108.2, offset: '+07:00', city: '다낭', country: '베트남', cc: 'VN' },
  tokyo: { lat: 35.68, lng: 139.69, offset: '+09:00', city: '도쿄', country: '일본', cc: 'JP' },
};

/** 그 도시에서 찍은 사진 한 장을 만들어요. */
function makePhoto(id, cityKey, takenAt) {
  const { lat, lng, offset } = CITIES[cityKey];
  return { id, takenAt, offset, lat, lng, fileKey: null };
}

/** 좌표에서 가장 가까운 도시 이름을 돌려줘요. reverseCity 대신 써요. */
function findCity(lat, lng) {
  const nearest = Object.values(CITIES).reduce((best, city) =>
    calcDistanceKm({ lat, lng }, city) < calcDistanceKm({ lat, lng }, best) ? city : best,
  );
  const { city, country, cc } = nearest;
  return { city, country, cc };
}

// 서울(집)에서 사진을 많이 찍고, 방콕에 한 번 다녀와요. 사진이 가장 많은 서울이 집이에요.
const BANGKOK_TRIP = [
  makePhoto('p_s1', 'seoul', '2024-07-01T09:00:00'),
  makePhoto('p_s2', 'seoul', '2024-07-05T09:00:00'),
  makePhoto('p_b1', 'bangkok', '2024-07-11T20:10:00'),
  makePhoto('p_b2', 'bangkok', '2024-07-13T10:00:00'),
  makePhoto('p_s3', 'seoul', '2024-07-20T09:00:00'),
  makePhoto('p_s4', 'seoul', '2024-07-21T09:00:00'),
];

describe('buildJourney 규칙', () => {
  test('집에서 나가고 들어오는 시각은 거리로 추정하고, 지점 쪽 시각은 사진 그대로예요', async () => {
    // when
    const journey = await buildJourney(BANGKOK_TRIP, [], findCity);

    // then
    const [outbound, back] = journey.legs;
    expect(outbound).toMatchObject({ kind: 'outbound', from: 'home', timing: 'estimated' });
    expect(back).toMatchObject({ kind: 'return', to: 'home', timing: 'estimated' });
    // 방콕 도착과 출발은 사진 시각이에요.
    expect(outbound.arriveAt).toBe('2024-07-11T20:10:00+07:00');
    expect(back.departAt).toBe('2024-07-13T10:00:00+07:00');
    // 추정한 집 쪽 시각은 집 사진의 시간대로 적어요. 집 사진(7/5) 시각을 쓰면 6일이 넘게 걸린 걸로 나와요.
    expect(outbound.departAt.endsWith('+09:00')).toBe(true);
    expect(back.arriveAt.endsWith('+09:00')).toBe(true);
    const outboundHours = (Date.parse(outbound.arriveAt) - Date.parse(outbound.departAt)) / 3600000;
    expect(outboundHours).toBeCloseTo(outbound.hours, 0);
    expect(outbound.hours).toBeLessThan(10);
  });

  test('이름은 집이 아닌 지점과 집 좌표로만 찾아요', async () => {
    // given: 앱의 reverseCity처럼 Promise를 돌려줘요
    const findPlace = vi.fn(async (lat, lng) => findCity(lat, lng));

    // when
    const journey = await buildJourney(BANGKOK_TRIP, [], findPlace);

    // then: 방콕 지점 하나 + 집 하나. 서울 지점들(집)은 지점 목록에 안 나가서 찾지 않아요.
    expect(findPlace).toHaveBeenCalledTimes(2);
    expect(journey.stops.map((stop) => stop.city)).toEqual(['방콕']);
    expect(journey.home.city).toBe('서울');
  });

  test('집 좌표를 찾을 때만 { isHome: true }를 넘겨요', async () => {
    // given
    const findPlace = vi.fn(async (lat, lng) => findCity(lat, lng));

    // when
    const journey = await buildJourney(BANGKOK_TRIP, [], findPlace);

    // then: 방콕 지점은 옵션 없이, 집은 집 좌표와 { isHome: true }로 찾아요
    const [stopCall, homeCall] = findPlace.mock.calls;
    expect(stopCall).toHaveLength(2);
    expect(homeCall).toEqual([journey.home.lat, journey.home.lng, { isHome: true }]);
  });

  test('집 지점이 연달아 있으면 집 하나로 보고 집 → 집 구간을 만들지 않아요', async () => {
    // given: 서울 사진 사이가 21일 넘게 비어서 서울 지점이 둘로 나뉘어요
    const photos = [
      makePhoto('p_s1', 'seoul', '2024-01-01T09:00:00'),
      makePhoto('p_s2', 'seoul', '2024-03-01T09:00:00'),
      makePhoto('p_s3', 'seoul', '2024-03-02T09:00:00'),
      makePhoto('p_b1', 'bangkok', '2024-03-10T09:00:00'),
      makePhoto('p_s4', 'seoul', '2024-03-20T09:00:00'),
    ];

    // when
    const journey = await buildJourney(photos, [], findCity);

    // then
    expect(journey.legs.map((leg) => leg.kind)).toEqual(['outbound', 'return']);
  });

  test('집에 안 들르고 다음 여행으로 가는 구간은 어느 여행에도 속하지 않아요', async () => {
    // given: 방콕과 다낭 사이가 14일 넘게 비어서 여행이 둘로 끊기는데, 그사이 집 사진이 없어요
    const photos = [
      makePhoto('p_s1', 'seoul', '2024-06-01T09:00:00'),
      makePhoto('p_s2', 'seoul', '2024-06-02T09:00:00'),
      makePhoto('p_s3', 'seoul', '2024-06-03T09:00:00'),
      makePhoto('p_b1', 'bangkok', '2024-07-11T09:00:00'),
      makePhoto('p_d1', 'danang', '2024-08-01T09:00:00'),
      makePhoto('p_s4', 'seoul', '2024-08-10T09:00:00'),
    ];

    // when
    const journey = await buildJourney(photos, [], findCity);

    // then
    const [bangkokTrip, danangTrip] = journey.trips;
    expect(journey.legs.map((leg) => [leg.kind, leg.tripId])).toEqual([
      ['outbound', bangkokTrip.id],
      ['gap', null],
      ['return', danangTrip.id],
    ]);
    expect(bangkokTrip.legIds).toEqual(['leg_1']);
    expect(danangTrip.legIds).toEqual(['leg_3']);
  });

  test('같은 도시·연도의 챕터가 또 나오면 주소에 -2를 붙여요', async () => {
    // given: 2024년에 도쿄에 14일 넘게 두 번 머물러요
    const photos = [
      makePhoto('p_s1', 'seoul', '2023-12-20T09:00:00'),
      makePhoto('p_s2', 'seoul', '2023-12-21T09:00:00'),
      makePhoto('p_t1', 'tokyo', '2024-01-01T09:00:00'),
      makePhoto('p_t2', 'tokyo', '2024-01-20T09:00:00'),
      makePhoto('p_s3', 'seoul', '2024-02-01T09:00:00'),
      makePhoto('p_s4', 'seoul', '2024-02-02T09:00:00'),
      makePhoto('p_t3', 'tokyo', '2024-03-01T09:00:00'),
      makePhoto('p_t4', 'tokyo', '2024-03-20T09:00:00'),
      makePhoto('p_s5', 'seoul', '2024-04-01T09:00:00'),
    ];

    // when
    const journey = await buildJourney(photos, [], findCity);

    // then
    expect(journey.stops.map((stop) => stop.slug)).toEqual(['도쿄-2024', '도쿄-2024-2']);
  });

  test('도시 이름에 주소를 깨는 글자가 있으면 챕터 주소에서 -로 바꿔요', async () => {
    // given: 도쿄에 14일 넘게 머무는데, 이름을 찾았더니 'A/B'처럼 /가 들어 있어요
    const photos = [
      makePhoto('p_s1', 'seoul', '2023-12-20T09:00:00'),
      makePhoto('p_s2', 'seoul', '2023-12-21T09:00:00'),
      makePhoto('p_s3', 'seoul', '2023-12-22T09:00:00'),
      makePhoto('p_t1', 'tokyo', '2024-01-01T09:00:00'),
      makePhoto('p_t2', 'tokyo', '2024-01-20T09:00:00'),
      makePhoto('p_s4', 'seoul', '2024-02-01T09:00:00'),
    ];
    const findPlace = (lat, lng) => {
      const place = findCity(lat, lng);
      return place.city === '도쿄' ? { ...place, city: 'A/B' } : place;
    };

    // when
    const journey = await buildJourney(photos, [], findPlace);

    // then: /chapter/A/B-2024가 되면 chapter/:slug 라우트와 안 맞아요
    expect(journey.stops[0].slug).toBe('A-B-2024');
  });

  test('이름을 여러 번 바꾸면 마지막 이름을 써요', async () => {
    // given
    const corrections = [
      { id: 'c_1', type: 'rename', anchorPhotoId: 'p_b2', name: '첫 이름' },
      { id: 'c_2', type: 'rename', anchorPhotoId: 'p_b1', name: '바꾼 이름' },
    ];

    // when
    const journey = await buildJourney(BANGKOK_TRIP, corrections, findCity);

    // then
    expect(journey.trips[0]).toMatchObject({ name: '바꾼 이름', nameSource: 'user' });
  });

  test('경유 지점은 여행 이름에서 빠져요', async () => {
    // given: 방콕 → 다낭 여행에서 방콕을 경유로 고쳐요
    const photos = [
      ...BANGKOK_TRIP.slice(0, 4),
      makePhoto('p_d1', 'danang', '2024-07-15T09:00:00'),
      ...BANGKOK_TRIP.slice(4),
    ];
    const corrections = [{ id: 'c_1', type: 'transit', photoIds: ['p_b1'] }];

    // when
    const journey = await buildJourney(photos, corrections, findCity);

    // then
    expect(journey.trips[0].name).toBe('다낭');
    expect(journey.legs.map((leg) => [leg.from, leg.to])).toEqual([
      ['home', 'p_d1'],
      ['p_d1', 'home'],
    ]);
  });

  test('나누기 보정의 사진부터 새 여행이고, 사이 구간은 gap이며 이름은 기준 사진이 든 앞 여행에 남아요', async () => {
    // given: 방콕 여행을 p_b2 앞에서 나누고, 이름은 첫 사진(p_b1)에 걸어 둠
    const corrections = [
      { id: 'c_1', type: 'rename', anchorPhotoId: 'p_b1', name: '내 방콕' },
      { id: 'c_2', type: 'split', beforePhotoId: 'p_b2' },
    ];

    // when
    const journey = await buildJourney(BANGKOK_TRIP, corrections, findCity);

    // then
    expect(journey.trips.map((trip) => [trip.id, trip.name, trip.nameSource])).toEqual([
      ['p_b1', '내 방콕', 'user'],
      ['p_b2', '방콕', 'auto'],
    ]);
    expect(journey.legs.map((leg) => leg.kind)).toEqual(['outbound', 'gap', 'return']);
  });

  test('나눈 자리의 사진을 빼도 여행은 나뉜 채예요', async () => {
    // given: 방콕 p_b1 · p_b2 · p_b3 중 p_b2 앞에서 나눈 뒤 p_b2를 뺌
    const photos = [
      ...BANGKOK_TRIP.slice(0, 4),
      makePhoto('p_b3', 'bangkok', '2024-07-14T10:00:00'),
      ...BANGKOK_TRIP.slice(4),
    ];
    const corrections = [
      { id: 'c_1', type: 'split', beforePhotoId: 'p_b2' },
      { id: 'c_2', type: 'exclude', photoId: 'p_b2' },
    ];

    // when
    const journey = await buildJourney(photos, corrections, findCity);

    // then
    expect(journey.trips.map((trip) => trip.stopIds)).toEqual([['p_b1'], ['p_b3']]);
  });

  describe('여행 합치기 보정', () => {
    const photos = [...BANGKOK_TRIP, makePhoto('p_d1', 'danang', '2024-08-01T09:00:00')];
    const merge = { id: 'm', type: 'merge', photoIds: ['p_b2', 'p_d1'] };

    test('집에 돌아왔다 다시 떠난 구간을 합친 여행에 남겨요', async () => {
      // when
      const journey = await buildJourney(photos, [merge], findCity);
      // then
      expect(journey.trips.map((trip) => trip.stopIds)).toEqual([['p_b1', 'p_d1']]);
      expect(journey.legs.map(({ kind, tripId }) => [kind, tripId])).toEqual([
        ['outbound', 'p_b1'],
        ['return', 'p_b1'],
        ['outbound', 'p_b1'],
      ]);
    });

    test('양쪽 여행의 마지막 이름과 출발 사진에 걸린 이동 수단을 유지해요', async () => {
      // given
      const corrections = [
        { id: 'r1', type: 'rename', anchorPhotoId: 'p_b1', name: '첫 여행' },
        { id: 'mode', type: 'mode', fromPhotoId: 'p_b1', mode: 'train' },
        { id: 'r2', type: 'rename', anchorPhotoId: 'p_d1', name: '두 번째 여행' },
        merge,
      ];
      const before = structuredClone({ photos, corrections });
      // when
      const journey = await buildJourney(photos, corrections, findCity);
      // then
      expect(journey.trips.map((t) => t.name)).toEqual(['두 번째 여행']);
      expect(journey.legs.find((leg) => leg.from === 'p_b1')).toMatchObject({
        mode: 'train',
        tripId: 'p_b1',
      });
      expect({ photos, corrections }).toEqual(before);
    });

    test('기준 사진을 제외해도 합치기가 유지되고, 보정을 지우면 두 여행으로 돌아가요', async () => {
      // given
      const exclude = { id: 'x', type: 'exclude', photoId: 'p_b2' };
      // when
      const merged = await buildJourney(photos, [merge, exclude], findCity);
      const undone = await buildJourney(photos, [exclude], findCity);
      // then
      expect(merged.trips.map((t) => t.stopIds)).toEqual([['p_b1', 'p_d1']]);
      expect(undone.trips.map((t) => t.stopIds)).toEqual([['p_b1'], ['p_d1']]);
    });
  });

  test('기간 필터 기준일은 오늘이 아니라 마지막 여행이 끝난 날이에요', async () => {
    // when
    const journey = await buildJourney(BANGKOK_TRIP, [], findCity);

    // then
    expect(journey.periods).toEqual({
      anchor: '2024-07-13',
      '1y': { from: '2023-07-13', to: '2024-07-13' },
      '2y': { from: '2022-07-13', to: '2024-07-13' },
      all: { from: '2024-07-11', to: '2024-07-13' },
    });
  });
});

describe('합치기 뒤에 바뀐 여행 사진', () => {
  const photo = (id, city, day) => makePhoto(id, city, `2025-03-${day}T12:00:00`);
  const homes = ['01', '02', '08', '09', '19', '20'].map((day) =>
    photo('home' + day, 'seoul', day),
  );
  const a = photo('a', 'tokyo', '03');
  const b = photo('b', 'bangkok', '12');
  const c = photo('c', 'danang', '22');
  const merge = (left, right) => ({ id: 'merge', type: 'merge', photoIds: [left, right] });
  const exclude = (id) => ({ id: 'exclude' + id, type: 'exclude', photoId: id });
  const rows = (j, cs, photos) => selectSortTrips(j, cs, photos, new Set(j.excluded));

  test.each([
    ['b', 'a', 'c'],
    ['c', 'a', 'b'],
  ])(
    '한쪽 여행의 유일한 사진 %s를 제외하면 다른 여행에 보정이 옮겨가지 않아요',
    async (removed, first, last) => {
      // given
      const photos = [...homes, a, b, c, photo('d', 'tokyo', '30'), photo('h4', 'seoul', '27')];
      const cs = [merge('b', 'c'), exclude(removed)];
      // when
      const j = await buildJourney(photos, cs, findCity);
      // then
      expect(j.trips.map((t) => t.stopIds)).toEqual([[first], [last], ['d']]);
      expect(
        rows(j, cs, photos).every((r) => !r.isMergingWithPrevious && !r.mergeCorrectionIds.length),
      ).toBe(true);
    },
  );

  test('두 기준 사진을 제외해도 양쪽 여행에 남은 사진으로 합치고 취소해요', async () => {
    // given
    const photos = [...homes, a, b, c, photo('b0', 'bangkok', '11'), photo('c2', 'danang', '23')];
    const cs = [merge('b', 'c'), exclude('b'), exclude('c')];
    // when
    const j = await buildJourney(photos, cs, findCity);
    // then
    expect(j.trips.map((t) => t.stopIds)).toEqual([['a'], ['b0', 'c2']]);
    expect(rows(j, cs, photos).map((r) => r.mergeCorrectionIds)).toEqual([[], ['merge']]);
  });

  test('중간 사진을 추가해 양쪽이 한 지점이 되어도 보정을 취소할 수 있어요', async () => {
    // given
    const photos = [
      ...homes,
      photo('first', 'tokyo', '04'),
      makePhoto('last', 'tokyo', '2025-05-05T12:00:00'),
    ];
    // 두 방문 사이에 집을 거치지 않게 집 사진은 출발 전으로 옮겨요.
    const original = photos.map((p) =>
      p.id.startsWith('home') ? { ...p, takenAt: p.takenAt.replace('03-', '02-') } : p,
    );
    const cs = [merge('first', 'last')];
    const added = [
      makePhoto('middle1', 'tokyo', '2025-03-23T12:00:00'),
      makePhoto('middle2', 'tokyo', '2025-04-10T12:00:00'),
      makePhoto('middle3', 'tokyo', '2025-04-25T12:00:00'),
    ];
    // when
    const before = await buildJourney(original, [], findCity);
    const all = [...original, ...added];
    const j = await buildJourney(all, cs, findCity);
    // then
    expect(before.trips).toHaveLength(2);
    expect(j.stops).toHaveLength(1);
    expect(rows(j, cs, all)[0].mergeCorrectionIds).toEqual(['merge']);
    const undone = await buildJourney(
      all,
      added.map((p) => exclude(p.id)),
      findCity,
    );
    expect(undone.trips).toHaveLength(2);
  });

  test('여권은 여행을 합친 뒤에도 외박·달력·첫 체류·방문 횟수를 유지해요', async () => {
    // given
    const photos = [
      ...homes,
      ...['03', '04', '12', '13'].map((day) => photo('th' + day, 'bangkok', day)),
    ];
    const merged = await buildJourney(photos, [merge('th04', 'th12')], findCity);
    const before = await buildJourney(photos, [], findCity);
    const legacy = structuredClone(merged);
    delete legacy.trips[0].outingStartIds;
    // when, then
    expect(merged.trips).toHaveLength(1);
    for (const j of [before, merged, legacy]) {
      expect(selectPassportStats(j).nightsAway).toBe(2);
      const calendar = selectPassportCalendar(j, '2025-03-31');
      expect(calendar.tripDays).toBe(4);
      expect(calendar.weeks.flatMap((w) => w.days).find((c) => c.date === '2025-03-08').kind).toBe(
        'home',
      );
      expect(selectPassportStamps(j)[0].days).toBe(2);
      expect(selectPassportRecords(j).mostVisited.visits).toBe(2);
    }
  });
});
