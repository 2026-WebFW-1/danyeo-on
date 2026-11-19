import CalendarGrid from './CalendarGrid';
import { CALENDAR_KINDS } from './calendarKinds';
import SectionHeading from './SectionHeading';
import { SECTION_CLASS } from './sectionClass';

/**
 * 05 CALENDAR 여행한 날 영역이에요. 머리 오른쪽에 칸 색의 범례를 두고, 아래에 최근 24개월 캘린더를 놓아요.
 *
 * 호출: PassportView가 selectPassportCalendar의 결과를 넘겨서 써요.
 * <CalendarSection calendar={calendar} />
 *
 * @param {object} props
 * @param {import('@/types').PassportCalendar} props.calendar
 */
export default function CalendarSection({ calendar }) {
  return (
    <section
      aria-labelledby="passport-calendar"
      className={`${SECTION_CLASS} flex flex-col gap-6 pt-24`}
    >
      <SectionHeading eyebrow="CALENDAR" title="여행한 날" titleId="passport-calendar">
        <ul aria-label="칸 색" className="flex items-center gap-4">
          {CALENDAR_KINDS.map(({ kind, label, className }) => (
            <li key={kind} className="flex items-center gap-1 text-sm text-muted">
              <span aria-hidden="true" className={`size-2.5 ${className}`} />
              {label}
            </li>
          ))}
        </ul>
      </SectionHeading>
      <CalendarGrid calendar={calendar} />
    </section>
  );
}
