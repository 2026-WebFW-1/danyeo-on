import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import {
  formatAnniversary,
  formatOnThisDayLead,
  formatOnThisDayTitle,
  formatYearsAgo,
  getLocalToday,
  parseTodayParam,
  selectOnThisDay,
  selectThumbPhotos,
} from '@/utils/onThisDay';

// 도시 이름을 id로도 써요. 시각은 한국(+09:00) 현지 시각이에요.
const stop = (city, from, to = from, overrides = {}) => ({
  id: city,
  tripId: 't1',
  city,
  country: '나라',
  cc: 'KR',
  from: `${from}T10:00:00+09:00`,
  to: `${to}T18:00:00+09:00`,
  days: 1,
  chapter: false,
  slug: null,
  transit: false,
  photoIds: [],
  photoCount: 0,
  coverFileKey: null,
  ...overrides,
});
const journeyOf = (...stops) => ({ stops });
const summary = (items) =>
  items.map(({ stop: item, yearsAgo, daysLeft }) => ({ city: item.city, yearsAgo, daysLeft }));

describe('selectOnThisDay', () => {
  describe('±3일', () => {
    test('1년 전 같은 날에서 3일 안에 머문 지점을 골라요', () => {
      const journey = journeyOf(stop('오사카', '2025-11-22', '2025-11-24'));

      expect(summary(selectOnThisDay(journey, '2026-11-19'))).toEqual([
        { city: '오사카', yearsAgo: 1, daysLeft: 3 },
      ]);
    });

    test('같은 날이 머문 기간 안이면 0일 떨어진 거예요(D-day는 시작일 기준이라 지났어요)', () => {
      const journey = journeyOf(stop('밴쿠버', '2025-11-10', '2025-11-25'));

      expect(summary(selectOnThisDay(journey, '2026-11-19'))).toEqual([
        { city: '밴쿠버', yearsAgo: 1, daysLeft: -9 },
      ]);
    });

    test('4일 떨어지면 ±3일이 아니라서, ±3일 안인 다른 해가 있으면 그 해만 보여요', () => {
      const journey = journeyOf(stop('교토', '2024-11-20'), stop('오사카', '2025-11-23'));

      expect(summary(selectOnThisDay(journey, '2026-11-19')).map(({ city }) => city)).toEqual([
        '교토',
      ]);
    });

    test('한 해에 같은 거리의 지점이 둘이면 먼저 온 지점이에요', () => {
      const journey = journeyOf(
        stop('부산', '2025-11-15', '2025-11-19'),
        stop('경주', '2025-11-19', '2025-11-20'),
      );

      expect(selectOnThisDay(journey, '2026-11-19')[0].stop.city).toBe('부산');
    });
  });

  describe('여러 해', () => {
    test('±3일 안인 해를 모두, 1년 전부터 오래된 순서로 줘요', () => {
      const journey = journeyOf(
        stop('도쿄', '2022-12-25'),
        stop('교토', '2023-11-19'),
        stop('파리', '2024-11-21'),
        stop('런던', '2025-11-17'),
      );

      expect(summary(selectOnThisDay(journey, '2026-11-19'))).toEqual([
        { city: '런던', yearsAgo: 1, daysLeft: -2 },
        { city: '파리', yearsAgo: 2, daysLeft: 2 },
        { city: '교토', yearsAgo: 3, daysLeft: 0 },
      ]);
    });
  });

  describe('±14일', () => {
    test('±3일 안인 해가 없으면 14일 안에서 가장 가까운 지점 하나만 줘요', () => {
      const journey = journeyOf(stop('교토', '2024-11-08'), stop('오사카', '2025-11-29'));

      expect(summary(selectOnThisDay(journey, '2026-11-19'))).toEqual([
        { city: '오사카', yearsAgo: 1, daysLeft: 10 },
      ]);
    });

    test('거리가 같으면 최근 해예요', () => {
      const journey = journeyOf(stop('교토', '2024-11-09'), stop('오사카', '2025-11-29'));

      expect(selectOnThisDay(journey, '2026-11-19')[0].stop.city).toBe('오사카');
    });

    test('14일을 넘으면 빈 배열이에요(00b를 그리지 않아요)', () => {
      const journey = journeyOf(stop('오사카', '2025-12-04'), stop('교토', '2024-11-04'));

      expect(selectOnThisDay(journey, '2026-11-19')).toEqual([]);
    });
  });

  describe('없음', () => {
    test.each([null, undefined, { stops: [] }])('여행이 없으면(%s) 빈 배열이에요', (journey) => {
      expect(selectOnThisDay(journey, '2026-11-19')).toEqual([]);
    });

    test('오늘이 첫 지점보다 앞이면 빈 배열이에요', () => {
      expect(selectOnThisDay(journeyOf(stop('오사카', '2025-11-19')), '2025-11-19')).toEqual([]);
    });
  });

  describe('경유 지점', () => {
    test('경유 지점은 같은 날이어도 고르지 않아요', () => {
      const journey = journeyOf(
        stop('도하', '2025-11-19', '2025-11-19', { transit: true }),
        stop('이스탄불', '2025-11-28'),
      );

      expect(summary(selectOnThisDay(journey, '2026-11-19'))).toEqual([
        { city: '이스탄불', yearsAgo: 1, daysLeft: 9 },
      ]);
    });

    test('경유 지점뿐이면 빈 배열이에요', () => {
      const journey = journeyOf(stop('도하', '2025-11-19', '2025-11-19', { transit: true }));

      expect(selectOnThisDay(journey, '2026-11-19')).toEqual([]);
    });
  });

  describe('연말·연초', () => {
    test('연초의 오늘은 그 전 해 연말 지점과 이어서 세요', () => {
      const journey = journeyOf(stop('파리', '2024-12-28', '2024-12-31'));

      // 1년 전 같은 날(2025-01-02)과 2일 차이예요. 1주년(2025-12-28)은 5일 지났어요.
      expect(summary(selectOnThisDay(journey, '2026-01-02'))).toEqual([
        { city: '파리', yearsAgo: 1, daysLeft: -5 },
      ]);
    });

    test('연말의 오늘은 다음 해 연초에 시작한 지점과 이어서 세요(가장 오래된 지점이어도요)', () => {
      const journey = journeyOf(stop('런던', '2025-01-01', '2025-01-03'));

      // 1년 전 같은 날(2024-12-30)과 2일 차이예요. 1주년은 2026-01-01이에요.
      expect(summary(selectOnThisDay(journey, '2025-12-30'))).toEqual([
        { city: '런던', yearsAgo: 1, daysLeft: 2 },
      ]);
    });

    test('현지 날짜로 세요(시간대를 빼고 UTC로 세면 하루가 밀려요)', () => {
      // 한국 11월 23일 새벽 0시 반은 UTC로 11월 22일이에요. 현지 날짜로 4일이라 ±3일 밖이에요.
      const journey = journeyOf(
        stop('교토', '2024-11-19'),
        stop('오사카', '2025-11-23', '2025-11-24', { from: '2025-11-23T00:30:00+09:00' }),
      );

      expect(selectOnThisDay(journey, '2026-11-19').map((item) => item.stop.city)).toEqual([
        '교토',
      ]);
    });
  });

  describe('2월 29일', () => {
    test('그 해에 2월 29일이 없으면 2월 28일로 봐요', () => {
      // 3월 1일로 보면 2027년 지점은 4일 차이라서 빠져요. 2월 28일로 봐야 두 해가 다 걸려요.
      const journey = journeyOf(stop('삿포로', '2026-02-28'), stop('도쿄', '2027-02-25'));

      expect(summary(selectOnThisDay(journey, '2028-02-29'))).toEqual([
        { city: '도쿄', yearsAgo: 1, daysLeft: -4 },
        { city: '삿포로', yearsAgo: 2, daysLeft: -1 },
      ]);
    });

    test('2월 29일에 시작한 지점은 2월 29일이 없는 해에 2월 28일이 주년이에요', () => {
      const journey = journeyOf(stop('부산', '2024-02-29', '2024-03-01'));

      expect(summary(selectOnThisDay(journey, '2025-02-27'))).toEqual([
        { city: '부산', yearsAgo: 1, daysLeft: 1 },
      ]);
    });
  });

  describe('데모 데이터(seojin)', () => {
    test('2026-11-19에는 2년 전 교토(2024.11.22 시작)예요', () => {
      expect(summary(selectOnThisDay(seojin, '2026-11-19'))).toEqual([
        { city: '교토', yearsAgo: 2, daysLeft: 3 },
      ]);
    });

    test('2026-09-20에는 1년 전 오사카예요', () => {
      expect(summary(selectOnThisDay(seojin, '2026-09-20'))).toEqual([
        { city: '오사카', yearsAgo: 1, daysLeft: -1 },
      ]);
    });
  });
});

describe('parseTodayParam', () => {
  test.each(['2026-11-19', '2028-02-29'])('있는 날짜(%s)는 그대로 줘요', (value) => {
    expect(parseTodayParam(value)).toBe(value);
  });

  test.each([
    null,
    undefined,
    '',
    'abc',
    '2026-1-9',
    '20261119',
    '2026-11-19T00:00',
    ' 2026-11-19',
  ])('모양이 틀리면(%s) null이에요', (value) => {
    expect(parseTodayParam(value)).toBeNull();
  });

  test.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10'])(
    '없는 날짜(%s)는 null이에요',
    (value) => {
      expect(parseTodayParam(value)).toBeNull();
    },
  );
});

describe('getLocalToday', () => {
  test('PC 시간대의 오늘 날짜예요(밤 늦게도 날짜가 넘어가지 않아요)', () => {
    expect(getLocalToday(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(getLocalToday(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('문구', () => {
  test.each([
    [9, 1, 'D-9 · 1주년'],
    [0, 1, 'D-DAY · 1주년'],
    [-3, 2, 'D+3 · 2주년'],
  ])('남은 날 %i, %i년 전이면 "%s"예요', (daysLeft, yearsAgo, label) => {
    expect(formatAnniversary({ daysLeft, yearsAgo })).toBe(label);
  });

  test.each([
    [1, 'ONE YEAR AGO'],
    [2, 'TWO YEARS AGO'],
    [10, 'TEN YEARS AGO'],
    [12, '12 YEARS AGO'],
  ])('%i년 전은 "%s"예요', (yearsAgo, label) => {
    expect(formatYearsAgo(yearsAgo)).toBe(label);
  });

  test('제목은 도시와 지점이 시작한 해(현지)예요', () => {
    expect(formatOnThisDayTitle({ city: '교토', from: '2024-12-31T23:30:00+09:00' })).toBe(
      '교토, 2024.',
    );
  });

  test('제목 아래 줄은 몇 년 전 이맘때 어디에 있었는지예요', () => {
    expect(formatOnThisDayLead({ stop: { city: '오사카' }, yearsAgo: 1 })).toBe(
      '1년 전 이맘때, 오사카에 있었어요.',
    );
  });
});

describe('selectThumbPhotos', () => {
  const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });
  const photos = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(photo);
  const withPhotos = stop('오사카', '2025-11-19', '2025-11-19', {
    photoIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    coverFileKey: 'public:/photos/p2.webp',
  });

  test('대표 사진을 빼고 앞에서 네 장이에요(촬영 순서)', () => {
    expect(selectThumbPhotos(withPhotos, photos).map(({ id }) => id)).toEqual([
      'p1',
      'p3',
      'p4',
      'p5',
    ]);
  });

  test('사진이 적으면 있는 만큼만 줘요', () => {
    const small = { ...withPhotos, photoIds: ['p1', 'p2', 'p3'] };

    expect(selectThumbPhotos(small, photos).map(({ id }) => id)).toEqual(['p1', 'p3']);
  });

  test('사진 목록을 아직 못 받았으면 빈 배열이에요(대표 사진만 있어서 빠져요)', () => {
    expect(selectThumbPhotos(withPhotos, [])).toEqual([]);
  });

  test('대표 사진이 없으면 앞에서 네 장이에요', () => {
    const noCover = { ...withPhotos, coverFileKey: null };

    expect(selectThumbPhotos(noCover, photos).map(({ id }) => id)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });
});
