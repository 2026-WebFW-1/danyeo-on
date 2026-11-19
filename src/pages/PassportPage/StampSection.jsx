import { STAMPS_PER_PAGE } from '@/constants/passport';

import SectionHeading from './SectionHeading';
import StampPage from './StampPage';
import { SECTION_CLASS } from './sectionClass';

/**
 * 05 VISAS 입국 스탬프 영역이에요. 머리 아래에 여권 쪽을 놓고, 스탬프가 10개를 넘으면 다음 쪽을 아래에 이어 붙여요.
 *
 * 호출: PassportView가 selectPassportStamps의 결과를 넘겨서 써요.
 * <StampSection stamps={stamps} />
 *
 * 의도: 쪽 번호는 1부터예요. 피그마의 "— 14 —"는 여권처럼 보이게 둔 장식 숫자라 따르지 않았어요.
 *
 * @param {object} props
 * @param {import('@/types').PassportStamp[]} props.stamps 처음 들어간 순서
 */
export default function StampSection({ stamps }) {
  const pages = [];
  for (let start = 0; start < stamps.length; start += STAMPS_PER_PAGE) {
    pages.push(stamps.slice(start, start + STAMPS_PER_PAGE));
  }

  return (
    <section
      aria-labelledby="passport-visas"
      className={`${SECTION_CLASS} flex flex-col gap-6 pt-24`}
    >
      <SectionHeading eyebrow="VISAS" title="입국 스탬프" titleId="passport-visas">
        <p className="text-md leading-body-md text-muted">
          스탬프를 누르면 그 나라의 여행으로 이동해요 →
        </p>
      </SectionHeading>
      {pages.map((pageStamps, index) => (
        <StampPage key={pageStamps[0].cc} stamps={pageStamps} pageNo={index + 1} />
      ))}
    </section>
  );
}
