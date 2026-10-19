import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { findChapterBySlug, getNextStop, selectChapters } from '@/utils/chapters';

/** 도시 이름으로 지점을 찾아요. 같은 이름이 둘이면 첫 번째예요. */
function findStop(journey, city) {
  return journey.stops.find((stop) => stop.city === city);
}

/** 지정한 지점의 transit을 true로 바꾼 journey를 만들어요. */
function withTransit(journey, stopId) {
  return {
    ...journey,
    stops: journey.stops.map((stop) => (stop.id === stopId ? { ...stop, transit: true } : stop)),
  };
}

describe('selectChapters', () => {
  test.each([
    ['seojin', seojin, ['밴쿠버-2025']],
    ['edge', edge, ['런던-2025', '파리-2025']],
    ['heavy', heavy, ['오사카-2022', '후쿠오카-2023', '파리-2024', '치앙마이-2025']],
  ])('%s의 챕터를 시간 순서대로 돌려줘요', (_name, journey, slugs) => {
    expect(selectChapters(journey).map((chapter) => chapter.stop.slug)).toEqual(slugs);
  });

  test('순번과 전체 수는 두 자리 문자열이에요 (03 / 12처럼 그대로 쓸 수 있어요)', () => {
    expect(selectChapters(edge).map(({ no, total }) => [no, total])).toEqual([
      ['01', '02'],
      ['02', '02'],
    ]);
    expect(selectChapters(seojin)[0]).toMatchObject({ no: '01', total: '01' });
  });

  test('경유 지점은 챕터 목록에서 빠져요', () => {
    const vancouver = findChapterBySlug(seojin, '밴쿠버-2025');

    expect(selectChapters(withTransit(seojin, vancouver.id))).toEqual([]);
  });

  test('챕터가 없거나 journey가 없으면 빈 배열이에요', () => {
    expect(selectChapters(empty)).toEqual([]);
    expect(selectChapters(null)).toEqual([]);
    expect(selectChapters(undefined)).toEqual([]);
  });
});

describe('findChapterBySlug', () => {
  test('주소로 챕터 지점을 찾아요', () => {
    expect(findChapterBySlug(seojin, '밴쿠버-2025')).toMatchObject({
      city: '밴쿠버',
      days: 57,
      chapter: true,
    });
    expect(findChapterBySlug(edge, '파리-2025').city).toBe('파리');
  });

  test('없는 주소는 null이에요', () => {
    expect(findChapterBySlug(seojin, '없는-slug')).toBeNull();
    expect(findChapterBySlug(seojin, null)).toBeNull();
    expect(findChapterBySlug(seojin, undefined)).toBeNull();
  });

  test('다른 인물의 주소나 빈 journey도 null이에요', () => {
    expect(findChapterBySlug(seojin, '런던-2025')).toBeNull();
    expect(findChapterBySlug(empty, '밴쿠버-2025')).toBeNull();
    expect(findChapterBySlug(null, '밴쿠버-2025')).toBeNull();
  });

  test('경유로 바뀐 지점은 주소가 있어도 찾지 않아요', () => {
    const vancouver = findChapterBySlug(seojin, '밴쿠버-2025');

    expect(findChapterBySlug(withTransit(seojin, vancouver.id), '밴쿠버-2025')).toBeNull();
  });
});

describe('getNextStop', () => {
  test('seojin 밴쿠버의 다음 지점은 밴프예요', () => {
    const vancouver = findChapterBySlug(seojin, '밴쿠버-2025');

    expect(getNextStop(seojin, vancouver.id).city).toBe('밴프');
  });

  test('챕터가 아닌 지점도 같은 여행 안의 다음 지점을 돌려줘요', () => {
    expect(getNextStop(seojin, findStop(seojin, '방콕').id).city).toBe('다낭');
  });

  test('여행의 마지막 지점은 다음 여행으로 넘어가지 않고 null이에요', () => {
    // edge는 런던·파리 뒤에도 다른 여행이 이어지지만, 각각 그 여행의 마지막 지점이에요.
    expect(getNextStop(edge, findChapterBySlug(edge, '런던-2025').id)).toBeNull();
    expect(getNextStop(edge, findChapterBySlug(edge, '파리-2025').id)).toBeNull();
    expect(getNextStop(seojin, findStop(seojin, '다낭').id)).toBeNull();
  });

  test('heavy 챕터의 다음 지점이에요', () => {
    expect(
      selectChapters(heavy).map(({ stop }) => getNextStop(heavy, stop.id)?.city ?? null),
    ).toEqual(['싱가포르', '도쿄', null, null]);
  });

  test('다음 지점이 경유면 건너뛰어요', () => {
    const vancouver = findChapterBySlug(seojin, '밴쿠버-2025');
    const banff = findStop(seojin, '밴프');

    // 밴프를 경유로 바꾸면 밴쿠버 뒤에 갈 곳이 없어요.
    expect(getNextStop(withTransit(seojin, banff.id), vancouver.id)).toBeNull();
  });

  test('없는 지점 ID나 빈 journey는 null이에요', () => {
    expect(getNextStop(seojin, 'p_none')).toBeNull();
    expect(getNextStop(empty, 'p_none')).toBeNull();
    expect(getNextStop(null, 'p_none')).toBeNull();
  });
});
