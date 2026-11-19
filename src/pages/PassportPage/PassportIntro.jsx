import { useFitWidth } from '@/hooks/useFitWidth';

import { SECTION_CLASS } from './sectionClass';

/**
 * 05 맨 위 머리예요. PASSPORT / 기간, 큰 제목 "TEN - STAMPS", 요약 문장이 가운데로 놓여요.
 *
 * 호출: PassportView가 formatPassportHeader의 결과를 넘겨서 써요.
 * <PassportIntro header={{ period: '2024 — 2026', countWord: 'NINE', stampWord: 'STAMPS', intro: '…' }} />
 *
 * 의도:
 *  - 03 머리(PlacesIntro)와 같은 짜임이에요. "STAMPS"는 속이 빈 글자(테두리만 검정)이고,
 *    하이픈은 글자 가운데 높이로 맞추려고 아래를 20px 비워 올려요.
 *  - 큰 제목은 128px 한 줄이라, 화면이 좁거나 숫자 단어가 길면("SEVENTEEN") 내용 폭을 넘쳐요.
 *    그래서 넘칠 때만 내용 폭에 맞게 통째로 줄여요(useFitWidth). 넓은 화면에서는 피그마 크기 그대로예요.
 *
 * @param {object} props
 * @param {{ period: string, countWord: string, stampWord: string, intro: string }} props.header
 */
export default function PassportIntro({ header }) {
  const { period, countWord, stampWord, intro } = header;
  const { containerRef, contentRef, scale, height } = useFitWidth();

  return (
    <header className={`${SECTION_CLASS} flex flex-col items-center`}>
      <div className="flex flex-col items-center gap-3 pt-24">
        <h1 className="text-xs text-muted">PASSPORT</h1>
        <p className="font-serif text-5xl font-bold tracking-[-0.02em] text-ink">{period}</p>
      </div>
      <div className="flex w-full flex-col items-center gap-5 pt-14">
        <div
          ref={containerRef}
          className="flex w-full items-start justify-center"
          style={{ height }}
        >
          <p
            ref={contentRef}
            className="flex shrink-0 origin-top items-center gap-5 font-serif text-display-md font-bold tracking-[-0.02em] whitespace-nowrap text-ink"
            style={{ transform: `scale(${scale})` }}
          >
            <span>{countWord}</span>
            <span className="pr-0.5 pb-5">-</span>
            <span className="text-transparent [-webkit-text-stroke:1px_var(--color-ink)]">
              {stampWord}
            </span>
          </p>
        </div>
        <p className="text-lg leading-body-lg text-body">{intro}</p>
      </div>
    </header>
  );
}
