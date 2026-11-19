import {
  CALENDAR_CELL_GAP,
  CALENDAR_CELL_SIZE,
  CALENDAR_HEIGHT,
  CALENDAR_LABEL_WIDTH,
  CALENDAR_MONTHS,
  CALENDAR_WEEKDAYS,
} from '@/constants/passport';
import { useFitScale } from '@/hooks/useFitScale';
import { cn } from '@/utils/cn';

import { CALENDAR_KINDS } from './calendarKinds';

// 한 열(한 주)이 차지하는 폭이에요. 칸 9px에 간격 2px이에요.
const COLUMN_STEP = CALENDAR_CELL_SIZE + CALENDAR_CELL_GAP;
const KIND_CLASS = Object.fromEntries(
  CALENDAR_KINDS.map(({ kind, className }) => [kind, className]),
);

/**
 * 하루 한 칸짜리 여행 캘린더예요. 위에 달 이름, 왼쪽에 월 · 수 · 금, 아래에 가장 긴 쉼을 괄호처럼 표시해요.
 *
 * 호출: CalendarSection이 selectPassportCalendar의 결과를 넘겨요.
 * <CalendarGrid calendar={calendar} />
 *
 * 의도:
 *  - 칸이 700개 넘게 있어서 칸마다 읽어 주지 않아요. 칸 묶음은 그림 하나(role="img")로 두고 여행한 날 수를 이름으로 붙여요.
 *  - 달 이름과 쉼 괄호는 열 번호로 자리를 잡아서, 피그마 1200px 기준대로 그린 뒤 좁은 화면에서는 통째로 줄여요(useFitScale).
 *    1024px 화면에서도 오른쪽 끝이 잘리지 않게 하려는 거예요. StampPage와 같은 방식이에요.
 *
 * @param {object} props
 * @param {import('@/types').PassportCalendar} props.calendar
 */
export default function CalendarGrid({ calendar }) {
  const { weeks, months, tripDays, longestRest } = calendar;
  const width = CALENDAR_LABEL_WIDTH + weeks.length * COLUMN_STEP - CALENDAR_CELL_GAP;
  const { ref, scale } = useFitScale(width);

  return (
    <div ref={ref} className="relative" style={{ height: CALENDAR_HEIGHT * scale }}>
      <div
        className="absolute top-0 left-0 h-[149px] origin-top-left"
        style={{ width, transform: `scale(${scale})` }}
      >
        <div aria-hidden="true" className="absolute top-1.5 left-10">
          {months.map((month) => (
            <span
              key={month.id}
              className={cn(
                'absolute top-0 font-serif text-2xs font-bold tracking-[0.2em] whitespace-nowrap text-dim',
                month.isYear && 'text-ink',
              )}
              style={{ left: month.column * COLUMN_STEP }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="absolute top-7 left-3 grid grid-rows-7 gap-0.5">
          {CALENDAR_WEEKDAYS.map((weekday) => (
            <span key={weekday.id} className="flex h-[9px] items-center text-2xs text-dim">
              {weekday.label}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`최근 ${CALENDAR_MONTHS}개월 중 여행한 날 ${tripDays}일`}
          className="absolute top-7 left-10 grid grid-flow-col grid-rows-7 gap-0.5"
        >
          {weeks.flatMap((week) =>
            week.days.map((day) => (
              <span
                key={day.date}
                className={cn('size-[9px] rounded-[1px]', KIND_CLASS[day.kind])}
              />
            )),
          )}
        </div>
        {longestRest && (
          <div
            className="absolute top-[115px] h-2"
            style={{
              left: CALENDAR_LABEL_WIDTH + longestRest.startColumn * COLUMN_STEP,
              width:
                (longestRest.endColumn - longestRest.startColumn) * COLUMN_STEP +
                CALENDAR_CELL_SIZE,
            }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-1 h-px bg-ink" />
            <span aria-hidden="true" className="absolute top-0 left-0 h-2 w-px bg-ink" />
            <span aria-hidden="true" className="absolute top-0 right-0 h-2 w-px bg-ink" />
            <p className="absolute top-3.5 left-1/2 -translate-x-1/2 text-sm font-medium whitespace-nowrap text-ink">
              {`가장 긴 쉼 · ${longestRest.days}일`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
