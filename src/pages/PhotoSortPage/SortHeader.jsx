import { SECTION_CLASS } from './sectionClass';

/**
 * 07 맨 위 머리예요. EDIT / 사진 정리, 큰 제목 "SORT - TRIPS", 안내 문구가 가운데로 놓여요.
 *
 * 호출: PhotoSortPage가 받는 값 없이 그려요.
 * <SortHeader />
 *
 * 의도:
 *  - 03 머리(PlacesIntro)와 같은 틀이에요. "TRIPS"는 속이 빈 글자, 하이픈은 아래를 20px 비워 글자 가운데 높이로 올려요.
 *  - 피그마 07b에는 큰 제목이 없지만, 탭을 바꿀 때 탭 줄이 위아래로 뛰지 않게 모든 탭에서 같은 머리를 둬요.
 */
export default function SortHeader() {
  return (
    <header className={`${SECTION_CLASS} flex flex-col items-center`}>
      <div className="flex flex-col items-center gap-3 pt-24">
        <p className="text-xs text-muted">EDIT</p>
        <h1 className="text-5xl font-bold tracking-[-0.02em] text-ink">사진 정리</h1>
      </div>
      <div className="flex flex-col items-center gap-5 pt-14">
        <p
          aria-hidden="true"
          className="flex items-center gap-5 font-serif text-display-md font-bold tracking-[-0.02em] whitespace-nowrap text-ink"
        >
          <span>SORT</span>
          <span className="pr-0.5 pb-5">-</span>
          <span className="text-transparent [-webkit-text-stroke:1px_var(--color-ink)]">TRIPS</span>
        </p>
        <p className="text-lg leading-body-lg text-body">
          사진 날짜와 위치로 자동으로 묶었어요. 틀린 곳만 고쳐 주세요.
        </p>
      </div>
    </header>
  );
}
