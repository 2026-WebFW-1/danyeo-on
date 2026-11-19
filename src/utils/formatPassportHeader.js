import { STAMP_COUNT_WORDS } from '@/constants/passport';
import { toLocalMonth, toLocalYear } from '@/utils/localDate';

const PERIOD_SEPARATOR = ' — ';
const MONTHS_PER_YEAR = 12;

/**
 * 첫 여행을 시작한 달부터 마지막 여행이 끝난 달까지 몇 달인지 세요. 두 달을 다 세서 같은 달이면 1이에요.
 * Date로 바꾸지 않고 현지 연·월을 잘라 써서 브라우저 시간대에 달이 밀리지 않아요.
 */
function countMonths(fromIso, toIso) {
  const [fromYear, fromMonth] = toLocalMonth(fromIso).split('-').map(Number);
  const [toYear, toMonth] = toLocalMonth(toIso).split('-').map(Number);
  return (toYear - fromYear) * MONTHS_PER_YEAR + (toMonth - fromMonth) + 1;
}

/**
 * 05 Passport 머리말(기간 · 큰 제목 · 요약 문장)의 글자를 만들어요. 여행이 0개면 null이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {{ stamps: number, countries: number, cities: number }} counts 스탬프 수와 selectPassportStats의 나라·도시 수
 * @returns {{ period: string, countWord: string, stampWord: string, intro: string } | null}
 *   예: { period: '2024 — 2026', countWord: 'EIGHT', stampWord: 'STAMPS',
 *         intro: '2년 동안 9개 나라, 19개 도시. 여권에 찍힌 순서대로 모았어요.' }
 */
export function formatPassportHeader(journey, { stamps, countries, cities }) {
  if (!journey || journey.trips.length === 0) return null;

  const { from } = journey.trips[0];
  const { to } = journey.trips.at(-1);
  const fromYear = toLocalYear(from);
  const toYear = toLocalYear(to);

  // 1년이 안 되면 달로, 넘으면 가까운 햇수로 말해요. 2024년 7월 ~ 2026년 8월(26달)은 "2년 동안"이에요.
  const months = countMonths(from, to);
  const span =
    months < MONTHS_PER_YEAR ? `${months}개월` : `${Math.round(months / MONTHS_PER_YEAR)}년`;

  return {
    period: fromYear === toYear ? fromYear : `${fromYear}${PERIOD_SEPARATOR}${toYear}`,
    countWord: STAMP_COUNT_WORDS[stamps] ?? String(stamps),
    stampWord: stamps === 1 ? 'STAMP' : 'STAMPS',
    intro: `${span} 동안 ${countries}개 나라, ${cities}개 도시. 여권에 찍힌 순서대로 모았어요.`,
  };
}
