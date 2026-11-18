import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DEFAULT_SORT_TAB, SORT_TAB_PARAM, SORT_TABS } from '@/constants/photoSort';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import {
  buildTripExcludeInputs,
  buildTripRenameInput,
  selectExcludedIds,
  selectExcludedPhotos,
  selectPhotoSummary,
  selectSortCounts,
  selectSortTrips,
  selectUnlocatedGroups,
} from '@/utils/photoSort';

import ExcludedTab from './ExcludedTab';
import JourneyStatusNotice from './JourneyStatusNotice';
import { SECTION_CLASS } from './sectionClass';
import SortHeader from './SortHeader';
import SortSummary from './SortSummary';
import SortTabs from './SortTabs';
import TripTable from './TripTable';
import UnlocatedTab from './UnlocatedTab';

/**
 * 07 사진 정리 페이지
 *
 * 책임: Journey · 사진 · 보정을 읽어 탭과 표로 보여 주고, 고친 내용을 보정으로 저장해요.
 * 호출: App의 Routes가 /edit/photos 주소에서 그려요. 보호 화면이라 RequireAuth 안에 있어요.
 *
 * 의도:
 *  - 보던 탭은 ?tab=(trips · unlocated · excluded)이에요. 새로고침이나 뒤로 가기에도 남고, 13 올리기 결과에서
 *    ?tab=unlocated로 바로 올 수 있어요. 없거나 모르는 값이면 여행 묶음이에요.
 *  - 보정을 저장하면 Journey를 다시 계산하는 데 20초쯤 걸려요(#151). 그동안 Journey는 앞 값이라,
 *    이름 · 뺀 사진 · 탭 개수는 보정 목록으로 덮어 보여 줘요(utils/photoSort).
 *  - 이름은 그 여행에 남아 있는 첫 사진에 걸어요(buildTripRenameInput). 어느 사진이든 그 여행에 들어 있으면
 *    buildJourney가 같은 여행을 찾아요. 그 사진을 빼면 남은 사진으로 이름을 옮겨 걸어요(buildTripExcludeInputs).
 *  - 한 여행의 이름 바꾸기 · 빼기는 하나씩 보내요(TripRow). 둘 다 지금 보정으로 입력을 만들어서, 앞 요청이 끝나기 전에
 *    보내면 이름을 옮긴 걸 모르고 빼서 이름이 사라질 수 있어요.
 *  - [복구]는 그 사진의 exclude를 모두 지워요. 같은 사진의 exclude가 둘일 수 있어서예요(BE #8).
 *  - 보정을 다 불러오기 전에는 저장할 수 없어서(useCorrectionStore.add) ✎ · [빼기]를 막아 둬요.
 *  - 사진을 다 받을 때까지 기다려요. useMyPhotos는 못 받는 동안 빈 배열을 줘서, 그대로 그리면 "불러온 사진 0"과
 *    회색 썸네일이 보여요. 사진을 못 받으면 고칠 수 없어서 Journey를 못 읽었을 때와 같이 안내만 해요.
 *
 * 피그마 07: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=36-2
 */
export default function PhotoSortPage() {
  const { journey, status } = useJourney();
  const { photos, status: photosStatus } = useMyPhotos();
  const {
    corrections,
    status: correctionStatus,
    add,
    addMany,
    removeMany,
    journeyStatus,
    refreshJourney,
  } = useCorrections();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get(SORT_TAB_PARAM);
  const tab = SORT_TABS.some((item) => item.key === requestedTab) ? requestedTab : DEFAULT_SORT_TAB;

  const isCorrectionsReady = correctionStatus === 'ready';
  // 다 불러오기 전의 보정 목록은 비어 있어서, 뺀 사진은 Journey의 값을 써요.
  const excludedIds = useMemo(
    () => selectExcludedIds(journey, isCorrectionsReady ? corrections : null),
    [journey, corrections, isCorrectionsReady],
  );
  const trips = useMemo(
    () => selectSortTrips(journey, corrections, photos, excludedIds),
    [journey, corrections, photos, excludedIds],
  );
  const counts = useMemo(
    () => selectSortCounts(journey, trips, excludedIds),
    [journey, trips, excludedIds],
  );
  const unlocatedGroups = useMemo(
    () => selectUnlocatedGroups(journey, photos, excludedIds),
    [journey, photos, excludedIds],
  );
  const excludedPhotos = useMemo(
    () => selectExcludedPhotos(corrections, photos),
    [corrections, photos],
  );
  const photoSummary = useMemo(() => selectPhotoSummary(photos), [photos]);
  const totals = useMemo(() => selectJourneyTotals(journey), [journey]);

  if (status === 'loading' || photosStatus === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas">
        <p role="status" className="text-lg text-muted">
          여행 기록을 불러오는 중이에요
        </p>
      </main>
    );
  }

  if (status === 'error' || photosStatus === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas">
        <p role="alert" className="text-lg text-body">
          {status === 'error' ? '여행 기록' : '사진'}을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      </main>
    );
  }

  const handleSelectTab = (key) => {
    setSearchParams({ [SORT_TAB_PARAM]: key });
  };

  const handleRename = (trip, name) => add(buildTripRenameInput(trip, name));
  const handleExclude = (trip, photoId) => addMany(buildTripExcludeInputs(trip, photoId));
  // 묶음의 사진을 차례로 빼고 Journey 계산은 끝에 한 번만 해요(사진마다 add하면 사진 수만큼 계산해요).
  // 실패하면 던지고, 그 전까지 뺀 사진은 이미 묶음에서 빠져 있어서 다시 누르면 남은 사진만 빼요.
  const handleExcludeMany = (photoIds) =>
    addMany(photoIds.map((photoId) => ({ type: 'exclude', photoId })));
  // 같은 사진의 exclude를 모두 지우고 Journey 계산은 한 번만 해요. 실패하면 던져, 다시 누르면 남은 것만 지워요.
  const handleRestore = (photo) => removeMany(photo.correctionIds);

  return (
    <main className="flex-1 bg-canvas pb-30">
      <SortHeader />
      <SortTabs current={tab} counts={counts} onSelect={handleSelectTab} />
      <SortSummary photos={photoSummary} tripCount={totals.trips} cityCount={totals.cities} />
      <JourneyStatusNotice status={journeyStatus} onRetry={refreshJourney} />
      {correctionStatus === 'error' && (
        <p role="alert" className={`${SECTION_CLASS} pt-6 text-md text-accent`}>
          고친 기록을 불러오지 못해 지금은 고칠 수 없어요. 새로고침해 주세요.
        </p>
      )}

      {tab === 'trips' && (
        <TripTable
          trips={trips}
          canEdit={isCorrectionsReady}
          onRename={handleRename}
          onExclude={handleExclude}
        />
      )}
      {tab === 'excluded' && (
        <ExcludedTab photos={excludedPhotos} status={correctionStatus} onRestore={handleRestore} />
      )}
      {tab === 'unlocated' && (
        <UnlocatedTab
          groups={unlocatedGroups}
          canExclude={isCorrectionsReady}
          onExclude={handleExcludeMany}
        />
      )}
    </main>
  );
}
