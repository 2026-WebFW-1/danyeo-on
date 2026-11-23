import { describe, expect, test, vi } from 'vitest';

import { JOURNEY_RULES_VERSION } from '@/constants/journey';
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
import { buildAnchorMoves, selectSortTrips } from '@/utils/photoSort';
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
  fukuoka: {
    lat: 33.59,
    lng: 130.4,
    offset: '+09:00',
    city: '후쿠오카',
    country: '일본',
    cc: 'JP',
  },
  chiangmai: {
    lat: 18.79,
    lng: 98.98,
    offset: '+07:00',
    city: '치앙마이',
    country: '태국',
    cc: 'TH',
  },
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

  test('사진이 지워진 exclude(photoId가 null)는 excluded에 넣지 않아요', async () => {
    // given
    const corrections = [
      { id: 'c_1', type: 'exclude', photoId: 'p_b2' },
      { id: 'c_2', type: 'exclude', photoId: null },
    ];

    // when
    const journey = await buildJourney(BANGKOK_TRIP, corrections, findCity);

    // then
    expect(journey.excluded).toEqual(['p_b2']);
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

describe('영구 삭제 전에 split · merge 기준 옮기기', () => {
  const excludedOf = (corrections) =>
    new Set(corrections.filter((c) => c.type === 'exclude').map((c) => c.photoId));

  /**
   * 사진을 영구 삭제한 뒤 my_data가 돌려줄 사진과 보정을 만들어요.
   * moves를 먼저 반영하고, 지운 사진을 가리키던 연결은 cascade로 빠진 모양(null · 짧아진 배열)이 돼요.
   */
  function deletePhoto(photos, corrections, photoId, moves) {
    const moved = moves.reduce(
      (current, move) =>
        current.map((correction) => {
          if (correction.id !== move.correctionId) return correction;
          if (correction.type === 'split') return { ...correction, beforePhotoId: move.toPhotoId };
          return {
            ...correction,
            photoIds: correction.photoIds.map((id) =>
              id === move.fromPhotoId ? move.toPhotoId : id,
            ),
          };
        }),
      corrections,
    );
    const cascaded = moved.map((correction) => {
      if (correction.type === 'exclude' && correction.photoId === photoId)
        return { ...correction, photoId: null };
      if (correction.type === 'split' && correction.beforePhotoId === photoId)
        return { ...correction, beforePhotoId: null };
      if (correction.type === 'merge')
        return { ...correction, photoIds: correction.photoIds.filter((id) => id !== photoId) };
      return correction;
    });
    return [photos.filter((photo) => photo.id !== photoId), cascaded];
  }

  async function tripsAfterDelete(photos, corrections, photoId, { move }) {
    const moves = move
      ? buildAnchorMoves(photoId, corrections, photos, excludedOf(corrections))
      : [];
    const [left, cs] = deletePhoto(photos, corrections, photoId, moves);
    const journey = await buildJourney(left, cs, findCity);
    return journey.trips.map((trip) => trip.stopIds);
  }

  test('나눈 자리의 사진을 지워도, 다음 사진으로 옮기면 여행이 나뉜 채예요', async () => {
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
    const moved = await tripsAfterDelete(photos, corrections, 'p_b2', { move: true });
    const notMoved = await tripsAfterDelete(photos, corrections, 'p_b2', { move: false });

    // then
    expect(buildAnchorMoves('p_b2', corrections, photos, excludedOf(corrections))).toEqual([
      { correctionId: 'c_1', fromPhotoId: 'p_b2', toPhotoId: 'p_b3' },
    ]);
    expect(moved).toEqual([['p_b1'], ['p_b3']]);
    // 옮기지 않으면 split이 사라져 한 여행 · 한 지점(방콕)으로 붙어요.
    expect(notMoved).toEqual([['p_b1']]);
  });

  test('합친 기준 사진을 지워도, 남은 사진으로 옮기면 여행이 합쳐진 채예요', async () => {
    // given
    const photos = [
      ...BANGKOK_TRIP.slice(0, 3),
      makePhoto('p_b0', 'bangkok', '2024-07-12T10:00:00'),
      ...BANGKOK_TRIP.slice(3),
      makePhoto('p_d1', 'danang', '2024-08-01T09:00:00'),
    ];
    const corrections = [
      { id: 'm', type: 'merge', photoIds: ['p_b2', 'p_d1'] },
      { id: 'x', type: 'exclude', photoId: 'p_b2' },
    ];

    // when
    const moved = await tripsAfterDelete(photos, corrections, 'p_b2', { move: true });
    const notMoved = await tripsAfterDelete(photos, corrections, 'p_b2', { move: false });

    // then
    expect(buildAnchorMoves('p_b2', corrections, photos, excludedOf(corrections))).toEqual([
      { correctionId: 'm', fromPhotoId: 'p_b2', toPhotoId: 'p_b0' },
    ]);
    expect(moved).toEqual([['p_b1', 'p_d1']]);
    expect(notMoved).toEqual([['p_b1'], ['p_d1']]);
  });

  test('합친 뒤 여행의 기준 사진을 지워도 합쳐진 채예요', async () => {
    // given
    const photos = [
      ...BANGKOK_TRIP,
      makePhoto('p_d1', 'danang', '2024-08-01T09:00:00'),
      makePhoto('p_d2', 'danang', '2024-08-02T09:00:00'),
    ];
    const corrections = [
      { id: 'm', type: 'merge', photoIds: ['p_b2', 'p_d1'] },
      { id: 'x', type: 'exclude', photoId: 'p_d1' },
    ];

    // when
    const moved = await tripsAfterDelete(photos, corrections, 'p_d1', { move: true });

    // then
    expect(moved).toEqual([['p_b1', 'p_d2']]);
  });

  // #232: 방콕 a · p · b와 다낭 d를 합친 뒤(b → d) b와 p를 뺐어요. 지금은 p가 a와 b를 한 여행으로 이어 줘서
  // merge가 b 대신 a를 써요. p가 없어지면 a와 b가 다른 여행이 되어 대신 쓸 사진을 못 찾아요.
  const bridged = () => {
    const homes = [
      ['h1', '2024-06-25'],
      ['h2', '2024-06-26'],
      ['h3', '2024-08-01'],
      ['h4', '2024-08-02'],
      ['h5', '2024-08-28'],
      ['h6', '2024-08-29'],
    ].map(([id, day]) => makePhoto(id, 'seoul', `${day}T09:00:00`));
    return [
      ...homes.slice(0, 2),
      makePhoto('a', 'bangkok', '2024-07-01T10:00:00'),
      makePhoto('p', 'bangkok', '2024-07-12T10:00:00'),
      makePhoto('b', 'bangkok', '2024-07-24T10:00:00'),
      ...homes.slice(2, 4),
      makePhoto('d', 'danang', '2024-08-20T10:00:00'),
      ...homes.slice(4),
    ];
  };

  test('기준이 아닌 뺀 사진을 지워도, 합친 여행이 합쳐진 채예요 (#232)', async () => {
    // given
    const photos = bridged();
    const corrections = [
      { id: 'm', type: 'merge', photoIds: ['b', 'd'] },
      { id: 'xb', type: 'exclude', photoId: 'b' },
      { id: 'xp', type: 'exclude', photoId: 'p' },
    ];

    // when
    const before = await buildJourney(photos, corrections, findCity);
    const moved = await tripsAfterDelete(photos, corrections, 'p', { move: true });
    const notMoved = await tripsAfterDelete(photos, corrections, 'p', { move: false });

    // then
    expect(before.trips.map((trip) => trip.stopIds)).toEqual([['a', 'd']]);
    expect(buildAnchorMoves('p', corrections, photos, excludedOf(corrections))).toEqual([
      { correctionId: 'm', fromPhotoId: 'b', toPhotoId: 'a' },
    ]);
    expect(moved).toEqual([['a', 'd']]);
    expect(notMoved).toEqual([['a'], ['d']]);
  });

  test('합치기가 여러 번 겹쳐도, 기준이 아닌 뺀 사진을 지운 뒤 여행이 그대로예요', async () => {
    // given: 방콕(a · p · b)과 다낭(d)을 합치고, 그 여행과 도쿄(t)를 다시 합친 뒤 b · d · p를 뺐어요
    const photos = [
      ...bridged(),
      makePhoto('h7', 'seoul', '2024-09-05T09:00:00'),
      makePhoto('t', 'tokyo', '2024-09-20T10:00:00'),
      makePhoto('t2', 'tokyo', '2024-09-21T10:00:00'),
      makePhoto('h8', 'seoul', '2024-09-28T09:00:00'),
    ];
    const corrections = [
      { id: 'm1', type: 'merge', photoIds: ['b', 'd'] },
      { id: 'm2', type: 'merge', photoIds: ['d', 't'] },
      { id: 'xb', type: 'exclude', photoId: 'b' },
      { id: 'xd', type: 'exclude', photoId: 'd' },
      { id: 'xp', type: 'exclude', photoId: 'p' },
    ];

    // when
    const before = await buildJourney(photos, corrections, findCity);
    const moved = await tripsAfterDelete(photos, corrections, 'p', { move: true });

    // then
    expect(moved).toEqual(before.trips.map((trip) => trip.stopIds));
  });

  test('지운 뒤에도 그대로인 합치기는 옮기지 않아서, 나중에 기준 사진을 복구해도 여행이 같아요', async () => {
    // given: 합친 뒤(b → d) b와 p를 빼고, 상관없는 사진 x도 뺐어요
    const photos = [...bridged(), makePhoto('x', 'tokyo', '2024-09-15T10:00:00')];
    const corrections = [
      { id: 'm', type: 'merge', photoIds: ['b', 'd'] },
      { id: 'xb', type: 'exclude', photoId: 'b' },
      { id: 'xp', type: 'exclude', photoId: 'p' },
      { id: 'xx', type: 'exclude', photoId: 'x' },
    ];
    const moves = buildAnchorMoves('x', corrections, photos, excludedOf(corrections));
    const restoreB = (cs) => cs.filter((c) => c.id !== 'xb');

    // when: x를 지운 뒤 b만 복구해요
    const [left, cs] = deletePhoto(photos, corrections, 'x', moves);
    const restored = await buildJourney(left, restoreB(cs), findCity);
    const notDeleted = await buildJourney(photos, restoreB(corrections), findCity);

    // then
    expect(moves).toEqual([]);
    expect(restored.trips.map((trip) => trip.stopIds)).toEqual(
      notDeleted.trips.map((trip) => trip.stopIds),
    );
  });

  test('나눈 자리 뒤에 찍은 사진이 없거나 합치기가 효과가 없으면 옮기지 않아요', () => {
    // given
    const photos = [...BANGKOK_TRIP, makePhoto('p_d1', 'danang', '2024-08-01T09:00:00')];
    const corrections = [
      { id: 's', type: 'split', beforePhotoId: 'p_d1' },
      { id: 'm', type: 'merge', photoIds: ['p_b2', 'p_d1'] },
      { id: 'x', type: 'exclude', photoId: 'p_d1' },
    ];

    // when
    const moves = buildAnchorMoves('p_d1', corrections, photos, excludedOf(corrections));

    // then
    expect(moves).toEqual([]);
  });
});

describe('buildJourney 이동 수단 추정(#247)', () => {
  // 서울(집)에서 사진을 많이 찍고, 한 번 다녀와요.
  const tripTo = (...awayPhotos) => [
    makePhoto('p_s1', 'seoul', '2024-07-01T09:00:00'),
    makePhoto('p_s2', 'seoul', '2024-07-05T09:00:00'),
    makePhoto('p_s3', 'seoul', '2024-07-06T09:00:00'),
    ...awayPhotos,
    makePhoto('p_s4', 'seoul', '2024-07-20T09:00:00'),
    makePhoto('p_s5', 'seoul', '2024-07-21T09:00:00'),
  ];
  const modesOf = (journey) => journey.legs.map((leg) => [leg.kind, leg.mode]);

  test('계산한 규칙의 판을 적어요', async () => {
    const journey = await buildJourney(BANGKOK_TRIP, [], findCity);

    expect(journey.rulesVersion).toBe(JOURNEY_RULES_VERSION);
  });

  test('서울 ↔ 후쿠오카는 700km가 안 돼도 바다를 건너서 비행이에요. 집 쪽 시각도 비행 속도로 추정해요', async () => {
    // given
    const photos = tripTo(
      makePhoto('p_f1', 'fukuoka', '2024-07-11T13:00:00'),
      makePhoto('p_f2', 'fukuoka', '2024-07-13T11:00:00'),
    );

    // when
    const journey = await buildJourney(photos, [], findCity);

    // then
    expect(modesOf(journey)).toEqual([
      ['outbound', 'flight'],
      ['return', 'flight'],
    ]);
    expect(journey.legs.map((leg) => leg.km)).toEqual([532, 532]);
    expect(journey.legs.map((leg) => leg.hours)).toEqual([1.2, 1.2]);
  });

  test.each([
    [
      '사진 사이가 30시간이면 속도를 알 수 없어 거리로 정해요',
      '2024-07-12T16:00:00',
      '+07:00',
      'train',
    ],
    [
      '사진 사이가 2시간이면 150km/h를 넘어서 비행이에요',
      '2024-07-11T12:00:00',
      '+07:00',
      'flight',
    ],
    [
      '시간대가 없는 사진은 간격을 믿을 수 없어서 속도를 재지 않아요',
      '2024-07-11T12:00:00',
      null,
      'train',
    ],
  ])('방콕 → 치앙마이(583km): %s', async (_, arriveAt, arriveOffset, mode) => {
    // given
    const photos = tripTo(makePhoto('p_b1', 'bangkok', '2024-07-11T10:00:00'), {
      ...makePhoto('p_c1', 'chiangmai', arriveAt),
      offset: arriveOffset,
    });

    // when
    const journey = await buildJourney(photos, [], findCity);

    // then
    const between = journey.legs.find((leg) => leg.kind === 'between');
    expect(between.km).toBe(583);
    expect(between.mode).toBe(mode);
  });
});
