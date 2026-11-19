import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { TODAY_PARAM } from '@/constants/onThisDay';
import { getLocalToday, parseTodayParam, selectOnThisDay } from '@/utils/onThisDay';

import OnThisDayScene from './OnThisDayScene';

/**
 * 00b 홈 · 1년 전 이맘때. 홈 첫 화면 아래로 스크롤하면 나와요.
 *
 * 책임: 오늘 날짜로 그릴 장면을 골라요. 고를 지점이 없으면 아무것도 그리지 않아서, 홈은 첫 화면만 남아요.
 * 호출: HomePage가 Journey를 받은 뒤에 첫 화면 아래에 그려요.
 * <OnThisDay journey={journey} />
 *
 * 의도:
 *  - 오늘은 이 PC의 날짜예요. 시연할 때는 주소에 ?today=YYYY-MM-DD를 붙여 바꿔요. 형식이 틀리면 무시해요.
 *  - 글과 사진은 그릴 장면이 있을 때만 불러요(OnThisDayScene). 장면이 없는 홈에서 글을 받지 않게요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=50-43
 *
 * @param {object} props
 * @param {import('@/types').Journey} props.journey
 */
export default function OnThisDay({ journey }) {
  const [searchParams] = useSearchParams();
  const today = parseTodayParam(searchParams.get(TODAY_PARAM)) ?? getLocalToday();
  const items = useMemo(() => selectOnThisDay(journey, today), [journey, today]);

  if (items.length === 0) return null;
  return <OnThisDayScene journey={journey} items={items} />;
}
