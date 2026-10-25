import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { chapterSlug } from '@/utils/chapterSlug';

/** chapterSlug가 읽는 값(city, from, transit)만 가진 지점을 만들어요. */
function makeStop(city, from, overrides = {}) {
  return { city, from, transit: false, chapter: true, ...overrides };
}

describe('fixture와 같은 주소를 만들어요', () => {
  test.each([
    ['seojin', seojin, ['밴쿠버-2025']],
    ['edge', edge, ['런던-2025', '파리-2025']],
    ['heavy', heavy, ['오사카-2022', '후쿠오카-2023', '파리-2024', '치앙마이-2025']],
    ['empty', empty, []],
  ])(
    '%s: 챕터 지점을 시간 순서대로 돌며 만든 주소가 데이터의 slug와 같아요',
    (_name, journey, slugs) => {
      // buildJourney가 하듯이, 앞서 만든 주소를 모아서 다음 지점에 넘겨요.
      const taken = [];
      const made = journey.stops
        .filter((stop) => stop.chapter)
        .map((stop) => {
          const slug = chapterSlug(stop, taken);
          taken.push(slug);
          return slug;
        });

      expect(made).toEqual(slugs);
      expect(made).toEqual(journey.stops.filter((stop) => stop.chapter).map((stop) => stop.slug));
    },
  );

  test('모든 지점에서 경유는 null이고, 나머지는 주소에 쓸 수 없는 글자가 없어요', () => {
    const stops = [seojin, edge, heavy].flatMap((journey) => journey.stops);

    for (const stop of stops) {
      const slug = chapterSlug(stop);
      if (stop.transit) {
        expect(slug).toBeNull();
      } else {
        expect(slug).toMatch(/^[^\s/?#%]+-\d{4}$/);
      }
    }
  });

  test('공백이 있는 도시(edge의 나이아가라 폴스)는 -로 이어요', () => {
    const niagara = edge.stops.find((stop) => stop.city === '나이아가라 폴스');

    expect(chapterSlug(niagara)).toBe('나이아가라-폴스-2026');
  });

  test('경유 지점(edge의 도하)은 null이에요', () => {
    const doha = edge.stops.find((stop) => stop.transit);

    expect(chapterSlug(doha)).toBeNull();
  });
});

describe('도시와 해', () => {
  test('도시 이름과 처음 찍은 해를 -로 이어요', () => {
    expect(chapterSlug(makeStop('밴쿠버', '2025-06-28T18:30:51-07:00'))).toBe('밴쿠버-2025');
  });

  test('연도는 시간대를 바꾸지 않은 현지 연도예요', () => {
    // UTC로 바꾸면 2026-01-01이라 2026이 돼요.
    expect(chapterSlug(makeStop('밴쿠버', '2025-12-31T23:50:00-08:00'))).toBe('밴쿠버-2025');
    // UTC로 바꾸면 2024-12-31이라 2024가 돼요.
    expect(chapterSlug(makeStop('서울', '2025-01-01T00:30:00+09:00'))).toBe('서울-2025');
  });

  test('두 해에 걸친 지점은 시작한 해를 써요', () => {
    const stop = makeStop('런던', '2025-12-20T10:00:00+00:00', { to: '2026-01-10T10:00:00+00:00' });

    expect(chapterSlug(stop)).toBe('런던-2025');
  });

  test('같은 입력이면 늘 같은 주소예요', () => {
    const stop = makeStop('파리', '2024-06-22T09:00:00+02:00');

    expect(chapterSlug(stop)).toBe(chapterSlug(stop));
  });
});

describe('겹치는 주소', () => {
  const paris = makeStop('파리', '2025-09-01T09:00:00+02:00');

  test('이미 쓴 주소와 겹치면 -2, 또 겹치면 -3이에요', () => {
    expect(chapterSlug(paris, ['파리-2025'])).toBe('파리-2025-2');
    expect(chapterSlug(paris, ['파리-2025', '파리-2025-2'])).toBe('파리-2025-3');
  });

  test('가운데 번호가 비어 있으면 그 번호를 먼저 채워요', () => {
    expect(chapterSlug(paris, ['파리-2025', '파리-2025-3'])).toBe('파리-2025-2');
  });

  test('도시나 해가 다르면 겹치지 않아요', () => {
    expect(chapterSlug(paris, ['런던-2025'])).toBe('파리-2025');
    expect(chapterSlug(paris, ['파리-2024'])).toBe('파리-2025');
  });

  test('같은 지점을 두 번 만들면 두 번째에 -2가 붙어요', () => {
    const taken = [];
    const first = chapterSlug(paris, taken);
    taken.push(first);
    const second = chapterSlug(paris, taken);

    expect([first, second]).toEqual(['파리-2025', '파리-2025-2']);
  });

  test.each([
    ['안 주면', undefined],
    ['null이면', null],
    ['빈 배열이면', []],
    ['빈 Set이면', new Set()],
  ])('이미 쓴 주소를 %s 겹침을 보지 않아요', (_name, taken) => {
    expect(chapterSlug(paris, taken)).toBe('파리-2025');
  });

  test.each([
    ['배열', ['파리-2025']],
    ['Set', new Set(['파리-2025'])],
    ['Map의 키', new Map([['파리-2025', true]]).keys()],
  ])('이미 쓴 주소는 %s로 줘도 돼요', (_name, taken) => {
    expect(chapterSlug(paris, taken)).toBe('파리-2025-2');
  });

  test('받은 목록과 지점을 바꾸지 않아요', () => {
    const array = ['파리-2025'];
    const set = new Set(['파리-2025']);
    const frozenStop = Object.freeze({ ...paris });

    chapterSlug(frozenStop, array);
    chapterSlug(frozenStop, set);

    expect(array).toEqual(['파리-2025']);
    expect([...set]).toEqual(['파리-2025']);
  });
});

describe('경유 지점과 챕터 판정', () => {
  test('경유 지점은 null이에요 (이미 쓴 주소를 줘도 같아요)', () => {
    const doha = makeStop('도하', '2025-04-10T12:00:00+03:00', { transit: true });

    expect(chapterSlug(doha)).toBeNull();
    expect(chapterSlug(doha, ['도하-2025'])).toBeNull();
  });

  test('챕터인지는 보지 않아요. 챕터로 정하는 건 buildJourney예요', () => {
    const notChapter = makeStop('교토', '2024-11-22T09:00:00+09:00', { chapter: false });

    expect(chapterSlug(notChapter)).toBe('교토-2024');
  });
});

describe('도시 이름 다듬기', () => {
  test.each([
    ['나이아가라 폴스', '나이아가라-폴스-2025'],
    ['A / B', 'A-B-2025'],
    ['A/B?C#D%E', 'A-B-C-D-E-2025'],
    ['앞뒤 공백  ', '앞뒤-공백-2025'],
    ['  파리  ', '파리-2025'],
    ['/파리/', '파리-2025'],
    ['공백이  여러   개', '공백이-여러-개-2025'],
    ['줄바꿈\n탭\t섞임', '줄바꿈-탭-섞임-2025'],
    ['넓은 공백　두 종류', '넓은-공백-두-종류-2025'],
    ['엑스-앙-프로방스', '엑스-앙-프로방스-2025'],
  ])('%j → %s', (city, expected) => {
    expect(chapterSlug(makeStop(city, '2025-05-01T09:00:00+00:00'))).toBe(expected);
  });

  test('다듬은 이름이 같으면 겹친 것으로 봐요', () => {
    const spaced = makeStop('나이아가라 폴스', '2025-05-01T09:00:00-04:00');
    const dashed = makeStop('나이아가라-폴스', '2025-08-01T09:00:00-04:00');
    const taken = [chapterSlug(spaced)];

    expect(chapterSlug(dashed, taken)).toBe('나이아가라-폴스-2025-2');
  });

  test('다듬은 주소는 encodeURIComponent로 바꿨다가 되돌려도 같아요', () => {
    const slug = chapterSlug(makeStop('A/B?C#D%E 가', '2025-05-01T09:00:00+00:00'));

    expect(decodeURIComponent(encodeURIComponent(slug))).toBe(slug);
    expect(slug).not.toMatch(/[\s/?#%]/);
  });
});
