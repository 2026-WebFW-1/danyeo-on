import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { PERIOD_PARAM, TRIP_PARAM } from '@/constants/journey';
import { useJourney } from '@/hooks/useJourney';
import { usePlayback } from '@/hooks/usePlayback';
import { parsePeriod } from '@/utils/mapScreen';
import { selectLegsByPeriod } from '@/utils/periodLegs';
import { calcPositionAtStop } from '@/utils/playback';
import { selectLegsByTrip } from '@/utils/tripLegs';

import ArrivalStack from './ArrivalStack';
import MapHeader from './MapHeader';
import MoveLegend from './MoveLegend';
import PeriodTabs from './PeriodTabs';
import PlaybackControls from './PlaybackControls';
import RouteMap from './RouteMap';
import TimelineScrubber from './TimelineScrubber';

const NO_STOPS = [];

/**
 * 01 지도 재생 화면
 *
 * 책임: 고른 기간이나 여행의 구간을 재생에 싣고, 지도를 화면 가득 깐 뒤 그 위에 부품을 겹쳐 놓습니다.
 * 호출: App의 Routes가 /map 주소에서 그립니다.
 *
 * 의도:
 *  - 기간은 ?period=로 둡니다. 새로고침하거나 주소를 나눠도 같은 기간이 보입니다.
 *  - ?trip=이 있으면 ?period=보다 먼저 봐서 그 여행만 재생합니다. 없는 ID는 잘못된 ?period=처럼 무시합니다.
 *  - 기간 탭을 누르면 주소를 ?period=만으로 바꿔서 ?trip=이 같이 지워지고 기간 재생으로 돌아갑니다.
 *  - 재생 상태는 usePlaybackStore에 있고, 버튼·타임라인·카드는 스토어에서 필요한 값만 꺼냅니다.
 *  - 여행이 없는 계정(home: null)은 지도만 그립니다. 빈 상태 화면(15a)이 생기면 그때 바꿉니다.
 *
 * 주의할 것들:
 *  - usePlayback은 시간을 흘리는 훅이라 여기서 한 번만 부릅니다.
 *  - legs를 useMemo로 감쌉니다. 새 배열을 넘기면 usePlayback이 처음부터 다시 재생합니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=4-2
 */
export default function MapPage() {
  const { journey, status } = useJourney();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = parsePeriod(searchParams.get(PERIOD_PARAM));
  const tripId = searchParams.get(TRIP_PARAM);
  const trip = journey?.trips.find((item) => item.id === tripId) ?? null;
  const legs = useMemo(
    () => (trip ? selectLegsByTrip(journey, trip.id) : selectLegsByPeriod(journey, period)),
    [journey, trip, period],
  );
  const { position, seek } = usePlayback(legs);

  const handleSelectPeriod = (nextPeriod) => {
    setSearchParams({ [PERIOD_PARAM]: nextPeriod }, { replace: true });
  };

  const handleSelectStop = (stopId) => {
    const stopPosition = calcPositionAtStop(legs, stopId);
    if (stopPosition) seek(stopPosition);
  };

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center bg-map">
        <p role="alert" className="text-lg text-body">
          여행 기록을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      </main>
    );
  }

  const home = journey?.home ?? null;
  const stops = journey?.stops ?? NO_STOPS;

  return (
    <main className="relative flex-1 overflow-hidden bg-map">
      <RouteMap
        home={home}
        stops={stops}
        legs={legs}
        progress={position}
        onSelectStop={handleSelectStop}
        className="absolute inset-0 size-full"
      />

      {home && (
        <>
          <MapHeader range={journey.periods[period]} trip={trip} />
          <PeriodTabs period={trip ? null : period} onSelect={handleSelectPeriod} />
          <PlaybackControls />
          <MoveLegend legs={legs} />
          <TimelineScrubber home={home} stops={stops} />
          <ArrivalStack stops={stops} />
        </>
      )}
    </main>
  );
}
