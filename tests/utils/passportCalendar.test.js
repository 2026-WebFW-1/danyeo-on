import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { getLocalToday, selectPassportCalendar } from '@/utils/passportCalendar';

const days = (calendar) => calendar.weeks.flatMap((week) => week.days);
const kindOf = (calendar, date) => days(calendar).find((day) => day.date === date)?.kind;
const inWindow = (calendar) => days(calendar).filter((day) => day.kind !== null);
const columnOf = (calendar, date) =>
  calendar.weeks.findIndex((week) => week.days.some((day) => day.date === date));

/** 날짜만 적어 여행을 만들어요. 시각은 한국 시간대로 붙여요. */
const trip = (from, to) => ({
  id: `t_${from}`,
  from: `${from}T10:00:00+09:00`,
  to: `${to}T18:00:00+09:00`,
});
const journeyOf = (...trips) => ({ stops: [], legs: [], trips });

describe('selectPassportCalendar', () => {
  test('오늘이 든 달까지 꽉 찬 24개월을 보여 주고, 앞뒤는 월요일 ~ 일요일로 채워 비워 둬요', () => {
    const calendar = selectPassportCalendar(seojin, '2026-11-19');
    const shown = inWindow(calendar);

    expect(shown[0].date).toBe('2024-12-01');
    expect(shown.at(-1).date).toBe('2026-11-30');
    expect(shown).toHaveLength(730);
    // 2024-12-01은 일요일이라 첫 주의 월 ~ 토는 비어요. 2026-11-30은 월요일이라 마지막 주의 화 ~ 일이 비어요.
    expect(calendar.weeks[0].id).toBe('2024-11-25');
    expect(calendar.weeks[0].days.map((day) => day.kind)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      'home',
    ]);
    expect(calendar.weeks.at(-1).id).toBe('2026-11-30');
    expect(
      calendar.weeks
        .at(-1)
        .days.slice(1)
        .every((day) => day.kind === null),
    ).toBe(true);
    expect(calendar.weeks).toHaveLength(106);
    expect(calendar.weeks.every((week) => week.days.length === 7)).toBe(true);
  });

  test('1월에 열면 2년 전 2월부터예요. 윤년의 2월 29일도 하루로 들어가요', () => {
    const shown = inWindow(selectPassportCalendar(seojin, '2026-01-05'));

    expect(shown[0].date).toBe('2024-02-01');
    expect(shown.at(-1).date).toBe('2026-01-31');
    expect(shown.map((day) => day.date)).toContain('2024-02-29');
  });

  test('여행의 첫날과 마지막 날을 다 여행한 날로 칠하고, 오늘 뒤는 아직 안 온 날이에요', () => {
    const calendar = selectPassportCalendar(edge, '2025-10-20');

    expect(kindOf(calendar, '2024-08-31')).toBe('home');
    expect(kindOf(calendar, '2024-09-01')).toBe('trip');
    expect(kindOf(calendar, '2025-04-12')).toBe('trip');
    expect(kindOf(calendar, '2025-04-13')).toBe('home');
    expect(kindOf(calendar, '2025-10-20')).toBe('home');
    expect(kindOf(calendar, '2025-10-21')).toBe('future');
    expect(kindOf(calendar, '2025-10-31')).toBe('future');
  });

  test('집에 안 들르고 이어진 여행 사이(gap)도 집 밖에 있던 날이에요', () => {
    // edge는 방콕(2024-09-03 끝)에서 집에 안 들르고 치앙마이(2024-09-21 시작)로 가요.
    const calendar = selectPassportCalendar(edge, '2025-10-20');

    expect(kindOf(calendar, '2024-09-03')).toBe('trip');
    expect(kindOf(calendar, '2024-09-12')).toBe('trip');
    expect(kindOf(calendar, '2024-09-21')).toBe('trip');
    expect(kindOf(calendar, '2024-09-24')).toBe('home');
  });

  test('날짜는 시각 글자에서 잘라 써서 브라우저 시간대와 상관없어요', () => {
    // 호놀룰루 여행은 현지 2025-03-04 19:00(-10:00)에 끝나요. UTC나 한국 시간으로는 3월 5일이에요.
    const calendar = selectPassportCalendar(edge, '2025-10-20');

    expect(kindOf(calendar, '2025-03-04')).toBe('trip');
    expect(kindOf(calendar, '2025-03-05')).toBe('home');
  });

  test('24개월 중 오늘까지 여행한 날을 세요', () => {
    expect(selectPassportCalendar(seojin, '2026-11-19').tripDays).toBe(97);
    expect(selectPassportCalendar(empty, '2026-11-19').tripDays).toBe(0);
  });

  test('가장 긴 쉼은 두 여행 사이에 집에 있던 가장 긴 기간이에요', () => {
    const calendar = selectPassportCalendar(seojin, '2026-11-19');

    // 졸업 여행(2026-01-08 끝) 다음 날부터 여수 · 순천(2026-05-23 시작) 전날까지예요.
    expect(calendar.longestRest).toEqual({
      days: 134,
      from: '2026-01-09',
      to: '2026-05-22',
      startColumn: columnOf(calendar, '2026-01-09'),
      endColumn: columnOf(calendar, '2026-05-22'),
    });
  });

  test('gap으로 이어진 여행 사이는 쉼이 아니에요', () => {
    const { longestRest } = selectPassportCalendar(edge, '2025-10-20');

    expect(longestRest).toMatchObject({ days: 110, from: '2025-04-13', to: '2025-07-31' });
  });

  test('앞 여행이 24개월보다 먼저 끝난 쉼은 세지 않아요', () => {
    const journey = journeyOf(
      trip('2024-06-01', '2024-06-03'),
      trip('2025-06-01', '2025-06-03'),
      trip('2025-06-10', '2025-06-12'),
    );

    expect(selectPassportCalendar(journey, '2026-11-19').longestRest).toMatchObject({
      days: 6,
      from: '2025-06-04',
      to: '2025-06-09',
    });
  });

  test('24개월 시작에 걸친 여행은 안쪽 날만 보고 쉼의 앞 여행으로 쳐요', () => {
    const journey = journeyOf(trip('2024-11-28', '2024-12-03'), trip('2025-01-10', '2025-01-12'));
    const calendar = selectPassportCalendar(journey, '2026-11-19');

    expect(kindOf(calendar, '2024-12-01')).toBe('trip');
    expect(calendar.longestRest).toMatchObject({ days: 37, from: '2024-12-04', to: '2025-01-09' });
  });

  test('길이가 같은 쉼이 여럿이면 앞의 것이에요', () => {
    const journey = journeyOf(
      trip('2025-01-01', '2025-01-02'),
      trip('2025-01-08', '2025-01-08'),
      trip('2025-01-14', '2025-01-15'),
    );

    expect(selectPassportCalendar(journey, '2026-11-19').longestRest).toMatchObject({
      days: 5,
      from: '2025-01-03',
    });
  });

  test('여행이 하나뿐이거나 다음 여행이 아직 안 왔으면 가장 긴 쉼이 없어요', () => {
    const one = journeyOf(trip('2025-01-01', '2025-01-05'));
    const laterTrip = journeyOf(trip('2025-01-01', '2025-01-05'), trip('2026-12-01', '2026-12-03'));

    expect(selectPassportCalendar(one, '2026-11-19').longestRest).toBeNull();
    expect(selectPassportCalendar(laterTrip, '2026-11-19').longestRest).toBeNull();
    expect(selectPassportCalendar(empty, '2026-11-19').longestRest).toBeNull();
  });

  test('달 이름은 1일이 든 열에 놓고, 1월은 연도로 적어요', () => {
    const calendar = selectPassportCalendar(seojin, '2026-11-19');

    expect(calendar.months).toHaveLength(24);
    expect(calendar.months[0]).toEqual({ id: '2024-12', column: 0, label: '12', isYear: false });
    expect(calendar.months[1]).toEqual({
      id: '2025-01',
      column: columnOf(calendar, '2025-01-01'),
      label: '2025',
      isYear: true,
    });
    expect(calendar.months.find((month) => month.id === '2026-01').label).toBe('2026');
    expect(calendar.months.at(-1)).toMatchObject({ id: '2026-11', label: '11' });
    for (const month of calendar.months) {
      expect(columnOf(calendar, `${month.id}-01`)).toBe(month.column);
    }
  });
});

describe('getLocalToday', () => {
  test('UTC가 아니라 브라우저 시간대의 날짜예요', () => {
    expect(getLocalToday(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(getLocalToday(new Date(2026, 10, 19, 23, 59))).toBe('2026-11-19');
  });
});
