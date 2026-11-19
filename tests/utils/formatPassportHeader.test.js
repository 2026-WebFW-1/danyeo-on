import { describe, expect, test } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { formatPassportHeader } from '@/utils/formatPassportHeader';

const COUNTS = { stamps: 8, countries: 9, cities: 19 };

/** 첫 여행 시작과 마지막 여행 끝만 바꾼 journey예요. */
const journeyFrom = (from, to) => ({
  trips: [
    { from, to: from },
    { from: to, to },
  ],
});

describe('formatPassportHeader', () => {
  test('seojin의 기간 · 큰 제목 · 요약 문장을 만들어요', () => {
    expect(formatPassportHeader(seojin, COUNTS)).toEqual({
      period: '2024 — 2026',
      countWord: 'EIGHT',
      stampWord: 'STAMPS',
      intro: '2년 동안 9개 나라, 19개 도시. 여권에 찍힌 순서대로 모았어요.',
    });
  });

  test('한 해 안의 여행이면 기간에 연도를 하나만 적고, 1년이 안 되면 달로 세요', () => {
    const journey = journeyFrom('2025-03-01T10:00:00+09:00', '2025-08-20T10:00:00+09:00');

    expect(formatPassportHeader(journey, COUNTS)).toMatchObject({
      period: '2025',
      intro: '6개월 동안 9개 나라, 19개 도시. 여권에 찍힌 순서대로 모았어요.',
    });
  });

  test('달은 현지 날짜로 세요. 12월 31일 밤 여행이 다음 해로 밀리지 않아요', () => {
    const journey = journeyFrom('2024-12-31T23:30:00-05:00', '2025-01-01T08:00:00+09:00');

    expect(formatPassportHeader(journey, COUNTS)).toMatchObject({
      period: '2024 — 2025',
      intro: expect.stringMatching(/^2개월 동안/),
    });
  });

  test.each([
    [1, 'ONE', 'STAMP'],
    [10, 'TEN', 'STAMPS'],
    [20, 'TWENTY', 'STAMPS'],
    [21, '21', 'STAMPS'],
  ])('스탬프 %i개는 "%s - %s"예요', (stamps, countWord, stampWord) => {
    expect(formatPassportHeader(seojin, { ...COUNTS, stamps })).toMatchObject({
      countWord,
      stampWord,
    });
  });

  test.each([
    ['여행이 0개인 journey', empty],
    ['journey가 없을 때', null],
  ])('%s는 null이에요', (_, journey) => {
    expect(formatPassportHeader(journey, COUNTS)).toBeNull();
  });
});
