import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DEFAULT_SORT_TAB, SORT_TAB_PARAM, SORT_TABS } from '@/constants/photoSort';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { selectPhotoSummary, selectSortCounts, selectSortTrips } from '@/utils/photoSort';

import JourneyStatusNotice from './JourneyStatusNotice';
import { SECTION_CLASS } from './sectionClass';
import SortHeader from './SortHeader';
import SortSummary from './SortSummary';
import SortTabs from './SortTabs';
import TripTable from './TripTable';

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
 *    표의 이름과 탭 개수는 보정 목록으로 덮어 보여 줘요(selectSortTrips · selectSortCounts).
 *  - 이름은 그 여행 첫 사진(여행 ID)에 걸어요. 어느 사진이든 그 여행에 들어 있으면 buildJourney가 같은 여행을 찾아요.
 *  - 보정을 다 불러오기 전에는 저장할 수 없어서(useCorrectionStore.add) ✎를 막아 둬요.
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
    journeyStatus,
    refreshJourney,
  } = useCorrections();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get(SORT_TAB_PARAM);
  const tab = SORT_TABS.some((item) => item.key === requestedTab) ? requestedTab : DEFAULT_SORT_TAB;

  const trips = useMemo(
    () => selectSortTrips(journey, corrections, photos),
    [journey, corrections, photos],
  );
  const counts = useMemo(() => selectSortCounts(journey, corrections), [journey, corrections]);
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

  const handleRename = (tripId, name) => add({ type: 'rename', anchorPhotoId: tripId, name });

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
        <TripTable trips={trips} canRename={correctionStatus === 'ready'} onRename={handleRename} />
      )}
      {/* TODO(endl24): 위치 확인 필요(07b) · 제외한 사진 목록은 #155의 다음 PR에서 붙여요 */}
      {tab !== 'trips' && (
        <p className={`${SECTION_CLASS} pt-12 text-center text-lg text-muted`}>
          이 탭은 준비하고 있어요.
        </p>
      )}
    </main>
  );
}
