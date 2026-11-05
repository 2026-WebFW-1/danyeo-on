import { describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import { formatJourneyIntro } from '@/utils/formatJourneyIntro';
import { selectJourneyTotals } from '@/utils/journeyTotals';

describe('formatJourneyIntro', () => {
  test('첫 여행을 시작한 달부터 곳과 여행 수를 세어 줘요', () => {
    expect(
      formatJourneyIntro({ firstTripStart: { year: 2024, month: 10 }, stops: 13, trips: 6 }),
    ).toBe('2024년 10월부터 13곳, 6번의 여행. 여행 하나를 골라 따라가 보세요.');
  });

  test('여행이 없으면 null이에요', () => {
    expect(formatJourneyIntro(selectJourneyTotals(null))).toBeNull();
  });

  test('seojin 합계로 만들어요(지점 19곳, 여행 14번)', () => {
    expect(formatJourneyIntro(selectJourneyTotals(seojin))).toMatch(
      /^\d{4}년 \d{1,2}월부터 19곳, 14번의 여행\./,
    );
  });
});
