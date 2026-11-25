import { cn } from '@/utils/cn';
import { formatTripRange } from '@/utils/mapScreen';

import { FRAME_CLASS } from './frameClass';

/**
 * 챕터 맨 위의 머리예요. "CHAPTER 03 · LONG STAY", "밴쿠버에서 보낸 62일", 기간 · 나라 · 사진 수, 오른쪽 위의 "03 / 12"가 있어요.
 *
 * 호출: ChapterView가 콜라주 위에 겹쳐 그려요. 위치(absolute)는 이 컴포넌트가 정해요.
 * <ChapterHeader stop={stop} chapter={chapter} />
 *
 * 의도:
 *  - 콜라주가 머리의 아랫부분과 겹치는 높이(Nav 아래 130px)에서 시작해서, 머리는 흐름에서 빼고 위에 얹어요.
 *    겹치는 자리에는 아무것도 놓이지 않아요.
 *  - 화면이 1440px보다 넓으면 콜라주와 같은 폭(FRAME_CLASS)으로 가운데에 둬요. "03 / 12"가 콜라주 오른쪽 끝에 맞게요.
 *  - 제목은 창이 1280px보다 좁으면 44px에서 36px로 한 단계 줄여요(#270). 머리는 콜라주처럼 줄지 않아서, 1024px 창에서
 *    "District of North Vancouver에서 보낸 57일"처럼 긴 제목이 오른쪽 "03 / 12"와 겹쳤어요. 1280px부터는 피그마 크기예요.
 *  - 글 칸은 오른쪽에 번호 자리(112px)를 비워 둬요. 그래도 긴 제목은 낱말 단위로 줄을 바꾸고(break-keep), 칸보다 긴
 *    낱말만 칸에 맞춰 끊어요(wrap-anywhere, #243). 줄이지 않고 줄만 바꾸면 머리가 길어져서, 아래 기간 줄이 콜라주 조각과
 *    겹쳐요(1024px에서 글 카드와 10px).
 *  - "03 / 12"의 줄 높이는 피그마처럼 글꼴 기본값(leading-[normal])이에요. leading-normal은 1.5배라서 줄이 5px 높아지고
 *    글자가 피그마보다 2px 내려가요.
 *  - 기간은 01 머리말과 같은 formatTripRange를 그대로 써요(양쪽 날짜를 모두 써요).
 *  - 점(·) 앞뒤의 빈칸이 둘인 건 피그마 그대로예요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop 챕터 지점
 * @param {import('@/types').ChapterItem} props.chapter 챕터 순번(no·total)
 */
export default function ChapterHeader({ stop, chapter }) {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className={cn(FRAME_CLASS, 'relative px-16 pt-14')}>
        <div className="flex flex-col gap-2 pr-28">
          <p className="font-serif text-xs font-bold tracking-[0.2em] whitespace-pre text-muted uppercase">
            {`CHAPTER ${chapter.no}  ·  LONG STAY`}
          </p>
          <h1 className="text-5xl font-bold tracking-[-0.02em] wrap-anywhere break-keep text-ink xl:text-6xl">
            {`${stop.city}에서 보낸 ${stop.days}일`}
          </h1>
          <p className="text-lg leading-body-lg whitespace-pre text-muted">
            {`${formatTripRange(stop)}  ·  ${stop.country} ${stop.cc}  ·  사진 ${stop.photoCount}장`}
          </p>
        </div>
        <p className="absolute top-16 right-16 font-serif text-4xl leading-[normal] text-dim italic">
          {`${chapter.no} / ${chapter.total}`}
        </p>
      </div>
    </header>
  );
}
