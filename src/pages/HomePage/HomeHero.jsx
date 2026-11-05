import { Link } from 'react-router';

import { formatHomeEyebrow, formatHomeHeadline, formatHomeIntro } from '@/utils/homeScreen';

const ADD_PHOTOS_STYLE =
  'border border-line px-6 py-4 text-lg leading-[normal] font-medium text-ink';

/**
 * 00 왼쪽의 소개 글과 버튼
 *
 * 의도: 여행이 없으면 재생할 것이 없어서 [여행 재생하기]를 빼고, 15a와 같은 안내 글을 보여 줘요.
 *
 * @param {object} props
 * @param {NonNullable<import('@/types').Journey['periods']>['all'] | null} props.range 여행이 없으면 null
 * @param {import('@/types').JourneyTotals} props.totals
 */
export default function HomeHero({ range, totals }) {
  if (!range) {
    return (
      <section className="relative flex flex-col items-start gap-6">
        <h1 className="text-6xl font-bold text-ink">아직 여행이 없어요</h1>
        <p className="text-lg leading-body-lg text-body">
          사진을 올리면 촬영 시각과 위치로
          <br />
          여행을 만들어 지도에 그려 드려요
        </p>
        <Link to="/upload" className={ADD_PHOTOS_STYLE}>
          + 사진 추가
        </Link>
      </section>
    );
  }

  const [firstLine, secondLine] = formatHomeHeadline(range, totals.cities);

  return (
    <section className="relative flex flex-col items-start gap-6">
      <p className="font-serif text-xs font-bold tracking-[0.2em] whitespace-pre text-muted uppercase">
        {formatHomeEyebrow(range)}
      </p>
      <h1 className="font-serif text-display-sm font-bold tracking-[-0.02em] whitespace-nowrap text-ink">
        {firstLine}
        <br />
        {secondLine}
      </h1>
      <p className="text-lg leading-body-lg whitespace-nowrap text-body">
        사진에 남은 위치와 날짜로 다시 그린 여행 지도.
        <br />
        {formatHomeIntro(totals)}
      </p>
      <div className="flex items-start gap-2">
        <Link to="/map" className="flex items-center gap-2 bg-ink py-4 pr-7 pl-6 text-white">
          <span aria-hidden="true" className="font-serif text-2xs font-bold">
            ▶
          </span>
          <span className="text-lg font-bold">여행 재생하기</span>
        </Link>
        <Link to="/upload" className={ADD_PHOTOS_STYLE}>
          + 사진 추가
        </Link>
      </div>
    </section>
  );
}
