import { SECTION_CLASS } from './sectionClass';

/**
 * 03 맨 위 머리예요. PLACES / JOURNEY, 큰 제목 "ON - THE ROAD", 한 줄 요약이 가운데로 놓여요.
 *
 * 호출: PlacesView가 한 줄 요약 글자(formatJourneyIntro)를 넘겨서 써요.
 * <PlacesIntro intro="2024년 10월부터 13곳, 6번의 여행. 여행 하나를 골라 따라가 보세요." />
 *
 * 의도: "THE ROAD"는 속이 빈 글자예요(글자 테두리만 검정). 하이픈은 글자 가운데 높이로 맞추려고 아래를 20px 비워 올려요.
 *
 * @param {object} props
 * @param {string | null} props.intro 한 줄 요약. 없으면 그 줄을 안 그려요
 */
export default function PlacesIntro({ intro }) {
  return (
    <header className={`${SECTION_CLASS} flex flex-col items-center`}>
      <div className="flex flex-col items-center gap-3 pt-24">
        <p className="text-xs text-muted">PLACES</p>
        <h1 className="font-serif text-5xl font-bold tracking-[-0.02em] text-ink">JOURNEY</h1>
      </div>
      <div className="flex flex-col items-center gap-5 pt-14">
        <p className="flex items-center gap-5 font-serif text-display-md font-bold tracking-[-0.02em] whitespace-nowrap text-ink">
          <span>ON</span>
          <span className="pr-0.5 pb-5">-</span>
          <span className="text-transparent [-webkit-text-stroke:1px_var(--color-ink)]">
            THE ROAD
          </span>
        </p>
        {intro && <p className="text-lg leading-body-lg text-body">{intro}</p>}
      </div>
    </header>
  );
}
