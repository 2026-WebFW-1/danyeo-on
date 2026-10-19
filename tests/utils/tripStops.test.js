import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import {
  getDaysBetweenTrips,
  getOneLiner,
  selectPostsOfStop,
  selectTripStops,
} from '@/utils/tripStops';

/** 이름으로 여행 ID를 찾아요. */
function findTripId(journey, name) {
  return journey.trips.find((trip) => trip.name === name).id;
}

/** 도시 이름으로 지점을 찾아요. 같은 이름이 둘이면 첫 번째예요. */
function findStop(journey, city) {
  return journey.stops.find((stop) => stop.city === city);
}

/** 한 여행의 지점을 [도시, 들어오는 구간]으로 줄여서 보기 쉽게 만들어요. */
function inboundsOf(journey, tripName) {
  return selectTripStops(journey, findTripId(journey, tripName)).map(({ stop, inbound }) => [
    stop.city,
    inbound,
  ]);
}

/** 테스트용 글. 이 파일이 읽는 값(date, title, body)만 있어요. */
function makePost(date, title = '', body = '') {
  return { date, title, body };
}

/** 글 배열에서 제목만 뽑아요. 비교할 때 보기 쉬워요. */
function seedPostTitles(posts) {
  return posts.map((post) => post.title);
}

describe('selectTripStops', () => {
  test('밴쿠버 · 밴프: 밴프는 밴쿠버에서 552km, 차로 와요', () => {
    expect(inboundsOf(seojin, '밴쿠버 · 밴프')[1]).toEqual([
      '밴프',
      { fromName: '밴쿠버', km: 552, mode: 'car' },
    ]);
  });

  test('졸업 여행: 런던은 파리에서 기차로, 바르셀로나는 런던에서 비행기로 와요', () => {
    const inbounds = inboundsOf(seojin, '졸업 여행');

    expect(inbounds[1]).toEqual(['런던', { fromName: '파리', km: 343, mode: 'train' }]);
    expect(inbounds[2]).toEqual(['바르셀로나', { fromName: '런던', km: 1138, mode: 'flight' }]);
  });

  test('첫 지점에는 집에서 나가는 구간(outbound)이 붙어요', () => {
    expect(inboundsOf(seojin, '방콕 · 다낭')[0]).toEqual([
      '방콕',
      { fromName: '서울', km: 3717, mode: 'flight' },
    ]);
    // edge의 집은 서울이 아니라 부산이에요.
    expect(inboundsOf(edge, '이스탄불')[0][1].fromName).toBe('부산');
  });

  test('집을 안 들르는 구간(gap)은 다음 여행의 첫 지점에 붙어요', () => {
    expect(inboundsOf(edge, '치앙마이')[0]).toEqual([
      '치앙마이',
      { fromName: '방콕', km: 586, mode: 'train' },
    ]);
  });

  test('경유 지점(도하)은 줄을 만들지 않아요', () => {
    const items = selectTripStops(edge, findTripId(edge, '이스탄불'));

    expect(items.map(({ stop }) => stop.city)).toEqual(['이스탄불']);
  });

  test('지점은 시간 순서대로 나와요', () => {
    const cities = selectTripStops(seojin, findTripId(seojin, '졸업 여행')).map(
      ({ stop }) => stop.city,
    );

    expect(cities).toEqual(['파리', '런던', '바르셀로나']);
  });

  test('집 정보가 없으면 집에서 오는 구간은 이름을 알 수 없어서 null이에요', () => {
    const items = selectTripStops({ ...seojin, home: null }, findTripId(seojin, '방콕 · 다낭'));

    expect(items[0].inbound).toBeNull();
    expect(items[1].inbound).toMatchObject({ fromName: '방콕' });
  });

  test('없는 여행이나 빈 journey는 빈 배열이에요', () => {
    expect(selectTripStops(seojin, 'p_none')).toEqual([]);
    expect(selectTripStops(empty, 'p_none')).toEqual([]);
    expect(selectTripStops(null, 'p_none')).toEqual([]);
  });
});

describe('getDaysBetweenTrips', () => {
  test('앞 여행 끝에서 다음 여행 시작까지의 현지 날짜 차이예요', () => {
    // 방콕 · 다낭은 7/16에 끝나고 강릉은 8/15에 시작해요.
    expect(getDaysBetweenTrips(seojin, findTripId(seojin, '방콕 · 다낭'))).toBe(30);
    expect(getDaysBetweenTrips(seojin, findTripId(seojin, '강릉'))).toBe(48);
  });

  test('서머타임이 끼어도 정수예요', () => {
    // 미국 서머타임은 2024-03-10에 시작해요. Date로 시각을 빼면 하루가 23시간인 날이 끼어서 30.11처럼 어긋나요.
    const journey = {
      trips: [
        { id: 'a', to: '2024-03-09T23:30:00-08:00' },
        { id: 'b', from: '2024-03-11T00:10:00-07:00' },
      ],
    };

    expect(getDaysBetweenTrips(journey, 'a')).toBe(2);
  });

  test('다음 여행이 없으면 null이에요', () => {
    const last = seojin.trips.at(-1);

    expect(getDaysBetweenTrips(seojin, last.id)).toBeNull();
  });

  test('없는 여행이나 빈 journey도 null이에요', () => {
    expect(getDaysBetweenTrips(seojin, 'p_none')).toBeNull();
    expect(getDaysBetweenTrips(empty, 'p_none')).toBeNull();
    expect(getDaysBetweenTrips(null, 'p_none')).toBeNull();
  });
});

describe('selectPostsOfStop', () => {
  test('같은 날을 두 지점이 나눠 가지면 먼저 오는 지점에만 붙어요', () => {
    // 부산은 2/28~3/1, 경주는 3/1~3/2예요. 그날 글이 seed에 없어서 직접 만들어요.
    const posts = [
      makePost('2025-02-28', 'a'),
      makePost('2025-03-01', 'b'),
      makePost('2025-03-02', 'c'),
    ];
    const busan = findStop(seojin, '부산');
    const gyeongju = findStop(seojin, '경주');

    expect(selectPostsOfStop(seojin, posts, busan.id).map((p) => p.title)).toEqual(['a', 'b']);
    expect(selectPostsOfStop(seojin, posts, gyeongju.id).map((p) => p.title)).toEqual(['c']);
  });

  test('날짜순으로 돌려주고, 받은 배열은 바꾸지 않아요', () => {
    const posts = [makePost('2025-06-30', 'b'), makePost('2025-06-28', 'a')];
    const vancouver = findStop(seojin, '밴쿠버');

    expect(selectPostsOfStop(seojin, posts, vancouver.id).map((p) => p.title)).toEqual(['a', 'b']);
    expect(posts.map((p) => p.title)).toEqual(['b', 'a']);
  });

  test('seed의 글은 모두 어느 한 지점에만 속해요', () => {
    const stops = seojin.stops.filter((stop) => !stop.transit);
    const owned = stops.flatMap((stop) => selectPostsOfStop(seojin, seojinSeed.posts, stop.id));

    expect(seedPostTitles(owned).sort()).toEqual(seedPostTitles(seojinSeed.posts).sort());
    expect(selectPostsOfStop(seojin, seojinSeed.posts, findStop(seojin, '밴쿠버').id)).toHaveLength(
      6,
    );
  });

  test('경유 지점은 글을 받지 않고, 그날 글은 같은 날 시작한 다음 지점이 가져가요', () => {
    // 도하(경유)와 이스탄불은 둘 다 2025-04-10에 시작해요.
    const posts = [makePost('2025-04-10', 'x')];
    const doha = edge.stops.find((stop) => stop.transit);
    const istanbul = findStop(edge, '이스탄불');

    expect(selectPostsOfStop(edge, posts, doha.id)).toEqual([]);
    expect(selectPostsOfStop(edge, posts, istanbul.id)).toEqual(posts);
  });

  test('없는 지점이나 글·journey가 없으면 빈 배열이에요', () => {
    expect(selectPostsOfStop(seojin, seojinSeed.posts, 'p_none')).toEqual([]);
    expect(selectPostsOfStop(seojin, null, findStop(seojin, '밴쿠버').id)).toEqual([]);
    expect(selectPostsOfStop(null, seojinSeed.posts, 'p_none')).toEqual([]);
  });
});

describe('getOneLiner', () => {
  test('본문이 있으면 본문이에요', () => {
    expect(getOneLiner([makePost('2025-06-28', '제목', '본문')])).toBe('본문');
  });

  test('본문이 비었거나 공백뿐이면 제목이에요', () => {
    expect(getOneLiner([makePost('2025-06-28', '제목', '')])).toBe('제목');
    expect(getOneLiner([makePost('2025-06-28', '제목', '  \n ')])).toBe('제목');
  });

  test('여러 글이면 첫 글에서 골라요', () => {
    const posts = [
      makePost('2025-06-28', '첫 글', ''),
      makePost('2025-06-30', '둘째', '둘째 본문'),
    ];

    expect(getOneLiner(posts)).toBe('첫 글');
  });

  test('글을 자르지 않아요', () => {
    const body = '길게 쓴 글이에요. '.repeat(50);

    expect(getOneLiner([makePost('2025-06-28', '제목', body)])).toBe(body);
  });

  test('seed 글은 본문이 비어 있어서 제목이 나와요', () => {
    const kyoto = findStop(seojin, '교토');
    const posts = selectPostsOfStop(seojin, seojinSeed.posts, kyoto.id);

    expect(getOneLiner(posts)).toBe('기요미즈데라 단풍');
  });

  test('글이 없으면 null이에요', () => {
    expect(getOneLiner([])).toBeNull();
    expect(getOneLiner(null)).toBeNull();
    expect(getOneLiner(undefined)).toBeNull();
  });
});
