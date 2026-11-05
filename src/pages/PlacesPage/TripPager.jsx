import { SECTION_CLASS } from './sectionClass';

/**
 * 03 맨 아래의 이전·다음 여행 이동이에요. 다음 여행까지 며칠인지도 같이 보여 줘요.
 *
 * 호출: PlacesView가 고른 여행의 앞뒤 여행을 넘겨서 써요.
 * <TripPager prev={prev} next={next} daysUntilNext={186} onSelect={handleSelectTrip} />
 *
 * 의도: 앞뒤 여행이 없으면 그쪽은 비워 두고, 다음 여행이 없으면 "— N일 뒤 —"와 점선도 안 그려요.
 * 피그마 가운데의 [전체 아카이브 보기 →]는 MVP 밖 화면(06)이라 넣지 않았어요.
 *
 * @param {object} props
 * @param {import('@/types').TripListItem | null} props.prev
 * @param {import('@/types').TripListItem | null} props.next
 * @param {number | null} props.daysUntilNext 이 여행이 끝나고 다음 여행이 시작할 때까지의 날 수
 * @param {(tripId: string) => void} props.onSelect
 */
export default function TripPager({ prev, next, daysUntilNext, onSelect }) {
  return (
    <nav
      aria-label="여행 이동"
      className={`${SECTION_CLASS} flex flex-col items-center gap-7 pb-30`}
    >
      {next && daysUntilNext !== null && (
        <>
          <span
            aria-hidden="true"
            className="block h-30 w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--color-accent)_0_2px,transparent_2px_8px)] opacity-40"
          />
          <p className="font-serif text-2xl font-normal text-muted italic">
            — {daysUntilNext}일 뒤 —
          </p>
        </>
      )}
      <div aria-hidden="true" className="h-px w-full bg-line" />
      <div className="flex w-full items-center justify-between">
        {prev ? (
          <button
            type="button"
            onClick={() => onSelect(prev.id)}
            className="flex items-center gap-3 whitespace-nowrap"
          >
            <span className="font-serif text-sm font-bold text-muted">← PREV</span>
            <span className="text-lg font-medium text-ink">
              {prev.no} {prev.name}
            </span>
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            onClick={() => onSelect(next.id)}
            className="flex items-center gap-3 whitespace-nowrap"
          >
            <span className="text-lg font-medium text-ink">
              {next.no} {next.name}
            </span>
            <span className="font-serif text-sm font-bold text-muted">NEXT TRIP →</span>
          </button>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
