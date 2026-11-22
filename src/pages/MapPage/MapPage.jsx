import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import NoTripsNotice from '@/components/common/NoTripsNotice';
import { PERIOD_PARAM, TRIP_PARAM } from '@/constants/journey';
import { useJourney } from '@/hooks/useJourney';
import { useLegModeDraft } from '@/hooks/useLegModeDraft';
import { useMapZoom } from '@/hooks/useMapZoom';
import { usePlayback } from '@/hooks/usePlayback';
import { canEditLegMode } from '@/utils/legMode';
import { parsePeriod } from '@/utils/mapScreen';
import { selectLegsByPeriod } from '@/utils/periodLegs';
import { calcPositionAtStop } from '@/utils/playback';
import { selectLegsByTrip } from '@/utils/tripLegs';

import ArrivalStack from './ArrivalStack';
import JourneyRefreshNotice from './JourneyRefreshNotice';
import LegModePanel from './LegModePanel';
import MapAttribution from './MapAttribution';
import MapHeader from './MapHeader';
import MapZoomControls from './MapZoomControls';
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
 *  - 여행이 없는 계정은 15a처럼 지도 위 가운데에 NoTripsNotice만 띄우고 기간 탭을 흐리게 둡니다.
 *    재생 부품(머리·재생 버튼·범례·타임라인·도착 카드)은 그리지 않고, ?trip=·?period=도 볼 게 없어 무시됩니다.
 *  - 여행이 없는지는 불러오기를 마친 뒤(status 'ready')의 journey.trips로 판단합니다.
 *    불러오는 동안에는 journey가 없어서, 안내가 잠깐 보였다 사라지지 않게 지도만 그립니다.
 *  - 이동 수단 고치기(기능 명세 M107)는 평소에 숨기고, 범례의 '고치기'를 누르면 고치기 모드로 들어갑니다.
 *    모드에서는 범례 자리에 구간 목록(LegModePanel)을 펼치고, 지도 라벨도 눌러서 고를 수 있습니다(RouteMap).
 *    고른 수단은 초안(useLegModeDraft)으로 지도·목록·범례에 먼저 보이고, 완료를 눌러야 저장합니다.
 *    취소·Esc·기간 바꾸기는 초안을 버립니다. 재생(usePlayback)에는 저장된 legs만 넘깁니다.
 *    라벨은 지나온 구간에만 있어서, 들어갈 때 재생을 멈추고 끝으로 옮겨 전체 동선과 라벨을 다 보여 줍니다.
 *  - 고치면 Journey가 다시 계산돼 legs가 새 배열로 오지만, 같은 경로라 재생 위치는 그대로입니다(usePlayback).
 *    계산 중이거나 실패하면 머리 아래에 알리고, 실패하면 거기서 다시 계산합니다(JourneyRefreshNotice).
 *  - 지도는 휠 · 끌기 · 오른쪽 버튼으로 확대하고 옮깁니다(useMapZoom, #184). 기간을 바꿔도 보던 자리는 그대로입니다.
 *    여행이 없는 계정은 볼 경로가 없어서 버튼을 두지 않습니다.
 *  - 지점 이름의 출처(OpenStreetMap) 표기는 여행이 없어도 구석에 둡니다(MapAttribution, #205).
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
  const { position, pause, seek } = usePlayback(legs);
  const { displayLegs, changes, setMode, clear } = useLegModeDraft(legs);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [highlightedLegId, setHighlightedLegId] = useState(null);
  const { ref: mapRef, zoom, isDragging, zoomIn, zoomOut, reset: resetZoom } = useMapZoom();
  const hasEditableLeg = legs.some(canEditLegMode);

  const handleStartEdit = () => {
    pause();
    seek(null);
    setIsEditingMode(true);
  };

  // 저장한 초안은 비우지 않아요. Journey를 다시 계산해 legs가 바뀌면 저절로 비어요(useLegModeDraft).
  const handleSavedEdit = () => {
    setIsEditingMode(false);
    setHighlightedLegId(null);
  };

  // 목록이 Esc 감시에 쓰는 함수라 같은 함수를 넘겨요.
  const handleCancelEdit = useCallback(() => {
    clear();
    setIsEditingMode(false);
    setHighlightedLegId(null);
  }, [clear]);

  // 기간을 바꾸면 처음부터 재생해서 라벨이 다시 하나씩 나와요. 고치던 화면과 달라지니 고치기를 취소해요.
  const handleSelectPeriod = (nextPeriod) => {
    handleCancelEdit();
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
  const hasNoTrips = status === 'ready' && journey.trips.length === 0;
  // 여행 데이터가 바뀌어 고칠 구간이 없어져도 빈 목록을 띄우지 않게 막아요.
  const isEditing = isEditingMode && home !== null && !hasNoTrips && hasEditableLeg;

  return (
    <main className="relative flex-1 overflow-hidden bg-map">
      <RouteMap
        home={home}
        stops={stops}
        legs={displayLegs}
        progress={position}
        onSelectStop={handleSelectStop}
        isLegModeEditing={isEditing}
        onChangeLegMode={setMode}
        highlightedLegId={isEditing ? highlightedLegId : null}
        ref={mapRef}
        zoom={zoom}
        isDragging={isDragging}
        className="absolute inset-0 size-full"
      />

      <MapAttribution />

      {hasNoTrips && (
        <>
          <PeriodTabs period={null} onSelect={handleSelectPeriod} disabled />
          <NoTripsNotice className="absolute top-1/2 left-1/2 -translate-1/2" />
        </>
      )}

      {home && !hasNoTrips && (
        <>
          <MapHeader range={journey.periods[period]} trip={trip} />
          <PeriodTabs period={trip ? null : period} onSelect={handleSelectPeriod} />
          <PlaybackControls />
          <MapZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
          {isEditing ? (
            <LegModePanel
              legs={displayLegs}
              changes={changes}
              home={home}
              stops={stops}
              highlightedLegId={highlightedLegId}
              onHighlight={setHighlightedLegId}
              onChangeMode={setMode}
              onSaved={handleSavedEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <MoveLegend legs={displayLegs} onEdit={hasEditableLeg ? handleStartEdit : undefined} />
          )}
          <TimelineScrubber home={home} stops={stops} />
          <ArrivalStack stops={stops} trips={journey.trips} />
          <JourneyRefreshNotice />
        </>
      )}
    </main>
  );
}
