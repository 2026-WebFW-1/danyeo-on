import { useMemo } from 'react';

import StatRow from '@/components/common/StatRow';
import { useJourney } from '@/hooks/useJourney';
import { selectGlobeRoutes } from '@/utils/globe';
import { formatMiniStats } from '@/utils/homeScreen';
import { selectJourneyTotals } from '@/utils/journeyTotals';

import HomeGlobe from './HomeGlobe';
import HomeHero from './HomeHero';

/**
 * 00 홈 첫 화면
 *
 * 책임: 지금까지의 여행을 지구본과 숫자로 보여 주고, 01 지도 재생과 13 사진 올리기로 보내요.
 * 호출: App의 Routes가 / 주소에서 그려요.
 *
 * 의도:
 *  - 숫자와 글자는 전부 Journey에서 계산해요. 계정마다 달라요.
 *  - 데이터를 읽는 동안은 지구본만 그려요. 0으로 시작한 숫자가 바뀌어 보이지 않게 해요.
 *  - routes를 useMemo로 감싸요. 새 배열을 넘기면 HomeGlobe가 경로를 처음부터 다시 그려요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=10-2
 */
export default function HomePage() {
  const { journey, status } = useJourney();
  const routes = useMemo(() => selectGlobeRoutes(journey), [journey]);

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas">
        <p role="alert" className="text-lg text-body">
          여행 기록을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      </main>
    );
  }

  const totals = journey ? selectJourneyTotals(journey) : null;

  return (
    // 왼쪽 글이 화면 폭으로 늘어나면 지구본을 덮어서 마우스가 닿지 않아요. items-start로 글 폭만큼만 차지해요.
    <main className="relative flex flex-1 flex-col items-start overflow-hidden bg-canvas px-16 pt-48.5 pb-14.25">
      <HomeGlobe home={journey?.home ?? null} routes={routes} />
      {journey && (
        <>
          <HomeHero range={journey.periods?.all ?? null} totals={totals} />
          <StatRow
            items={formatMiniStats(totals)}
            variant="mini"
            className="relative mt-auto pt-10"
          />
        </>
      )}
    </main>
  );
}
