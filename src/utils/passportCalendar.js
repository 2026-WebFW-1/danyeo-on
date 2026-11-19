import { CALENDAR_MONTHS } from '@/constants/passport';
import { toUtcDay } from '@/utils/localDate';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/**
 * 브라우저 시간대의 오늘 날짜를 돌려줘요.
 * toISOString은 UTC 날짜라서 한국에서 오전 9시 전에 열면 어제가 나와요. 그래서 현지 연·월·일을 직접 이어 붙여요.
 *
 * @param {Date} [now]
 * @returns {string} 예: '2026-11-19'
 */
export function getLocalToday(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * UTC 자정 밀리초를 날짜 글자로 바꿔요. UTC 자정이라 toISOString의 날짜가 그대로 그 날이에요.
 *
 * @param {number} utcDay
 * @returns {string}
 */
function toDateString(utcDay) {
  return new Date(utcDay).toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/**
 * 집 밖에 있던 날을 모아요. 여행의 첫날부터 마지막 날까지에,
 * 집에 안 들르고 다음 여행으로 이어진 구간(gap)의 날도 넣어요. 05 DAYS AWAY와 같은 기준이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @returns {Set<number>} UTC 자정 밀리초
 */
function collectAwayDays(journey) {
  const days = new Set();
  const addRange = (fromIso, toIso) => {
    for (let day = toUtcDay(fromIso); day <= toUtcDay(toIso); day += MS_PER_DAY) days.add(day);
  };

  for (const trip of journey?.trips ?? []) addRange(trip.from, trip.to);
  for (const leg of journey?.legs ?? []) {
    if (leg.kind === 'gap') addRange(leg.departAt, leg.arriveAt);
  }
  return days;
}

/**
 * 앞뒤가 모두 여행한 날인 '집에 있던 날' 묶음 중 가장 긴 것을 찾아요. 길이가 같으면 앞의 것이에요.
 * 24개월 안의 칸만 보므로, 앞 여행이 기간보다 먼저 끝났거나 뒤 여행이 아직 없으면 그 쉼은 세지 않아요.
 *
 * @param {{ date: string, kind: string | null, column: number }[]} cells 기간 안의 칸, 날짜 순서
 * @returns {import('@/types').PassportCalendar['longestRest']}
 */
function findLongestRest(cells) {
  let longest = null;
  let restStart = -1;
  let hasTripBefore = false;

  cells.forEach((cell, index) => {
    if (cell.kind === 'home') {
      if (hasTripBefore && restStart === -1) restStart = index;
      return;
    }
    if (cell.kind === 'trip' && restStart !== -1) {
      const days = index - restStart;
      if (!longest || days > longest.days) {
        const first = cells[restStart];
        const last = cells[index - 1];
        longest = {
          days,
          from: first.date,
          to: last.date,
          startColumn: first.column,
          endColumn: last.column,
        };
      }
    }
    restStart = -1;
    hasTripBefore = cell.kind === 'trip';
  });

  return longest;
}

/**
 * 05 여행 캘린더를 계산해요. 오늘이 든 달까지 24개월을 하루 한 칸으로, 한 주(월 → 일)를 한 열로 놓아요.
 * 기간 앞뒤를 꽉 찬 주로 채우는 칸은 kind가 null이라 비워 그려요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} today 현지 날짜 'YYYY-MM-DD'. 테스트에서 고정할 수 있게 밖에서 받아요
 * @returns {import('@/types').PassportCalendar}
 */
export function selectPassportCalendar(journey, today) {
  const [year, month] = today.split('-').map(Number);
  const todayDay = toUtcDay(today);
  // Date.UTC는 넘친 달을 알아서 앞 해로 넘겨요. 일을 0으로 주면 앞 달의 마지막 날이에요.
  const windowStart = Date.UTC(year, month - CALENDAR_MONTHS, 1);
  const windowEnd = Date.UTC(year, month, 0);
  // getUTCDay는 일요일이 0이라, 월요일부터 센 순서로 바꿔요.
  const leadingDays = (new Date(windowStart).getUTCDay() + 6) % DAYS_PER_WEEK;
  const windowDays = (windowEnd - windowStart) / MS_PER_DAY + 1;
  const totalDays = Math.ceil((leadingDays + windowDays) / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const awayDays = collectAwayDays(journey);

  const weeks = [];
  const months = [];
  const cells = [];

  for (let index = 0; index < totalDays; index += 1) {
    const day = windowStart + (index - leadingDays) * MS_PER_DAY;
    const date = toDateString(day);
    const column = Math.floor(index / DAYS_PER_WEEK);
    if (index % DAYS_PER_WEEK === 0) weeks.push({ id: date, days: [] });

    const isInWindow = day >= windowStart && day <= windowEnd;
    let kind = null;
    if (isInWindow) {
      if (day > todayDay) kind = 'future';
      else kind = awayDays.has(day) ? 'trip' : 'home';
    }
    weeks[column].days.push({ date, kind });
    if (!isInWindow) continue;

    cells.push({ date, kind, column });
    const [dateYear, dateMonth, dateOfMonth] = date.split('-');
    if (dateOfMonth === '01') {
      const isYear = dateMonth === '01';
      months.push({
        id: `${dateYear}-${dateMonth}`,
        column,
        label: isYear ? dateYear : String(Number(dateMonth)),
        isYear,
      });
    }
  }

  return {
    weeks,
    months,
    tripDays: cells.filter((cell) => cell.kind === 'trip').length,
    longestRest: findLongestRest(cells),
  };
}
