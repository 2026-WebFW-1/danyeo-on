import { formatTripRange } from '@/utils/mapScreen';

/**
 * 챕터 맨 위의 머리예요. "CHAPTER 03 · LONG STAY", "밴쿠버에서 보낸 62일", 기간 · 나라 · 사진 수, 오른쪽 위의 "03 / 12"가 있어요.
 *
 * 호출: ChapterView가 콜라주 위에 겹쳐 그려요. 위치(absolute)는 이 컴포넌트가 정해요.
 * <ChapterHeader stop={stop} chapter={chapter} />
 *
 * 의도:
 *  - 콜라주 첫 타일이 머리의 아랫부분과 겹치는 높이(Nav 아래 130px)에서 시작해서, 머리는 흐름에서 빼고 위에 얹어요.
 *    겹치는 자리에는 아무것도 놓이지 않아요.
 *  - 기간은 01 머리말과 같은 formatTripRange를 그대로 써요(양쪽 날짜를 모두 써요).
 *  - 점(·) 앞뒤의 빈칸이 둘인 건 피그마 그대로예요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop 챕터 지점
 * @param {import('@/types').ChapterItem} props.chapter 챕터 순번(no·total)
 */
export default function ChapterHeader({ stop, chapter }) {
  return (
    <header className="absolute inset-x-0 top-0 z-10 px-16 pt-14">
      <div className="flex flex-col gap-2">
        <p className="font-serif text-xs font-bold tracking-[0.2em] whitespace-pre text-muted uppercase">
          {`CHAPTER ${chapter.no}  ·  LONG STAY`}
        </p>
        <h1 className="text-6xl font-bold tracking-[-0.02em] text-ink">
          {`${stop.city}에서 보낸 ${stop.days}일`}
        </h1>
        <p className="text-lg leading-body-lg whitespace-pre text-muted">
          {`${formatTripRange(stop)}  ·  ${stop.country} ${stop.cc}  ·  사진 ${stop.photoCount}장`}
        </p>
      </div>
      <p className="absolute top-16 right-16 font-serif text-4xl leading-normal text-dim italic">
        {`${chapter.no} / ${chapter.total}`}
      </p>
    </header>
  );
}
