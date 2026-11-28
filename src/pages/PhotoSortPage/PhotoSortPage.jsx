import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { DEFAULT_SORT_TAB, SORT_TAB_PARAM, SORT_TABS } from '@/constants/photoSort';
import { useAirports } from '@/hooks/useAirports';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { deleteAllMyData } from '@/services/myDataService';
import { useAuthStore } from '@/stores/authStore';
import { useCorrectionStore } from '@/stores/correctionStore';
import { usePostStore } from '@/stores/postStore';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import {
  buildAnchorMoves,
  buildTripExcludeInputs,
  buildTripRenameInput,
  invertAnchorMove,
  selectExcludedIds,
  selectExcludedPhotos,
  selectPhotoSummary,
  selectSortCounts,
  selectSortTrips,
  selectTransitPhotoIds,
  selectUnlocatedGroups,
} from '@/utils/photoSort';
import { selectTransitCandidateIds } from '@/utils/transitCandidates';

import ExcludedTab from './ExcludedTab';
import JourneyStatusNotice from './JourneyStatusNotice';
import { SECTION_CLASS } from './sectionClass';
import SortHeader from './SortHeader';
import SortSummary from './SortSummary';
import SortTabs from './SortTabs';
import TransitNotice from './TransitNotice';
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
 *  - 경유(C107)는 공항에 잠깐 머문 지점을 CHECK 배너로 물어봐요. [경유로 처리]는 그 지점에 남은 사진을 모두 transit 보정에
 *    넣어요. 지점 ID는 첫 사진 ID라, 한 장만 넣으면 그 사진을 뺐을 때 경유가 풀려요. 되돌리기는 그 보정을 모두 지워요.
 *  - [복구]는 그 사진의 exclude를 모두 지워요. 서버가 사진마다 하나만 저장하지만(BE #8) 둘이 남아 있어도 복구되게요.
 *  - 보정을 다 불러오기 전에는 저장할 수 없어서(useCorrectionStore.add) ✎ · [빼기]를 막아 둬요.
 *  - [사진 모두 삭제](#284)와 다른 쓰기(07 편집 · Journey 계산 · 13 올리기)는 서로 막아요. 겹치면 지우기 전 사진으로
 *    계산한 옛 Journey가 지운 뒤에 다시 저장돼요. 중간에 실패해도 앞 단계는 이미 지워져서, 끝나면 성공 · 실패와
 *    상관없이 보정 · 글 스토어를 비워 다시 읽게 해요.
 *  - 사진을 다 받을 때까지 기다려요. useMyPhotos는 못 받는 동안 빈 배열을 줘서, 그대로 그리면 "불러온 사진 0"과
 *    회색 썸네일이 보여요. 사진을 못 받으면 고칠 수 없어서 Journey를 못 읽었을 때와 같이 안내만 해요.
 *
 * 피그마 07: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=36-2
 */
export default function PhotoSortPage() {
  const { journey, status, isRefreshing } = useJourney();
  const { photos, status: photosStatus } = useMyPhotos();
  const {
    corrections,
    status: correctionStatus,
    add,
    addMany,
    removeMany,
    moveAnchors,
    hasPending,
    journeyStatus,
    refreshJourney,
  } = useCorrections();
  const airports = useAirports();
  const userId = useAuthStore((state) => state.user?.id);
  const resetCorrections = useCorrectionStore((state) => state.reset);
  const resetPosts = usePostStore((state) => state.reset);
  const resetUpload = useUploadStore((state) => state.reset);
  // 13에서 저장 · Journey 계산 · 이미지 올리기가 도는 중이에요.
  const isUploadBusy = useUploadStore(
    (state) =>
      state.saveStatus === 'saving' ||
      state.journeyStatus === 'building' ||
      state.imageUpload.uploaded + state.imageUpload.skipped + state.imageUpload.failed <
        state.imageUpload.total,
  );
  const navigate = useNavigate();
  // 지우는 사이 Nav · [완료]로 07을 떠났으면, 다 지운 뒤 13으로 끌고 가지 않아요.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // 'idle' | 'deleting' | 'failed'
  const [deleteAllStatus, setDeleteAllStatus] = useState('idle');
  const isDeletingAll = deleteAllStatus === 'deleting';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get(SORT_TAB_PARAM);
  const tab = SORT_TABS.some((item) => item.key === requestedTab) ? requestedTab : DEFAULT_SORT_TAB;

  const isCorrectionsReady = correctionStatus === 'ready';
  const canEdit = isCorrectionsReady && !isDeletingAll;
  // 다 불러오기 전의 보정 목록은 비어 있어서, 뺀 사진은 Journey의 값을 써요.
  const excludedIds = useMemo(
    () => selectExcludedIds(journey, isCorrectionsReady ? corrections : null),
    [journey, corrections, isCorrectionsReady],
  );
  const transitPhotoIds = useMemo(
    () => selectTransitPhotoIds(journey, isCorrectionsReady ? corrections : null),
    [journey, corrections, isCorrectionsReady],
  );
  const trips = useMemo(
    () =>
      selectSortTrips(
        journey,
        corrections,
        photos,
        excludedIds,
        transitPhotoIds,
        selectTransitCandidateIds(journey, airports),
      ),
    [journey, corrections, photos, excludedIds, transitPhotoIds, airports],
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
  const handleSplit = (photoId) => add({ type: 'split', beforePhotoId: photoId });
  // 같은 자리를 두 번 나눴을 수 있어서, 그 줄을 떼어 낸 split을 모두 지우고 Journey 계산은 한 번만 해요.
  const handleUndoSplit = (trip) => removeMany(trip.splitCorrectionIds);
  const handleMarkTransit = (city) =>
    add({ type: 'transit', photoIds: city.photos.map((photo) => photo.id) });
  const handleUndoTransit = (city) => removeMany(city.transitCorrectionIds);
  // 묶음의 사진을 차례로 빼고 Journey 계산은 끝에 한 번만 해요(사진마다 add하면 사진 수만큼 계산해요).
  // 실패하면 던지고, 그 전까지 뺀 사진은 이미 묶음에서 빠져 있어서 다시 누르면 남은 사진만 빼요.
  const handleExcludeMany = (photoIds) =>
    addMany(photoIds.map((photoId) => ({ type: 'exclude', photoId })));
  // 같은 사진의 exclude를 모두 지우고 Journey 계산은 한 번만 해요. 실패하면 던져, 다시 누르면 남은 것만 지워요.
  const handleRestore = (photo) => removeMany(photo.correctionIds);
  // 영구 삭제할 사진에 건 split · merge를 남은 사진으로 옮겨, 지운 뒤에도 여행이 그대로이게 해요.
  // 옮길 사진은 차례가 온 뒤의 보정으로 정해요(useCorrectionStore.moveAnchors). 사진을 못 지우면 돌려준 함수로 되돌려요.
  const handleMoveAnchors = async (photo) => {
    const moved = await moveAnchors((current) =>
      buildAnchorMoves(photo.id, current, photos, selectExcludedIds(journey, current)),
    );
    return () => moveAnchors(() => moved.map(invertAnchorMove));
  };

  const handleDeleteAll = async () => {
    setDeleteAllStatus('deleting');
    // 끝날 때 비우면, 지우는 사이 13으로 가서 새로 고른 사진까지 지워져요.
    resetUpload();
    try {
      await deleteAllMyData(userId);
    } catch (error) {
      console.error(error);
      setDeleteAllStatus('failed');
      return;
    } finally {
      resetCorrections();
      resetPosts();
    }
    if (isMountedRef.current) navigate('/upload');
  };

  return (
    <main className="flex-1 bg-canvas pb-30">
      <SortHeader />
      <SortTabs current={tab} counts={counts} onSelect={handleSelectTab} />
      <SortSummary
        photos={photoSummary}
        tripCount={totals.trips}
        cityCount={totals.cities}
        canDeleteAll={
          canEdit &&
          !hasPending &&
          !isRefreshing &&
          journeyStatus !== 'building' &&
          !isUploadBusy
        }
        deleteStatus={deleteAllStatus}
        onDeleteAll={handleDeleteAll}
      />
      <JourneyStatusNotice
        status={journeyStatus}
        onRetry={refreshJourney}
        canRetry={!isDeletingAll}
      />
      {correctionStatus === 'error' && (
        <p role="alert" className={`${SECTION_CLASS} pt-6 text-md text-accent`}>
          고친 기록을 불러오지 못해 지금은 고칠 수 없어요. 새로고침해 주세요.
        </p>
      )}

      {tab === 'trips' && (
        <>
          <TransitNotice trips={trips} canEdit={canEdit} onMark={handleMarkTransit} />
          <TripTable
            trips={trips}
            canEdit={canEdit}
            onRename={handleRename}
            onExclude={handleExclude}
            onSplit={handleSplit}
            onUndoSplit={handleUndoSplit}
            onUndoTransit={handleUndoTransit}
            canMerge={
              canEdit &&
              !hasPending &&
              !isRefreshing &&
              journeyStatus !== 'building' &&
              journeyStatus !== 'failed'
            }
            onMerge={add}
            onUndoMerge={(trip) => removeMany(trip.mergeCorrectionIds)}
          />
        </>
      )}
      {tab === 'excluded' && (
        // 영구 삭제한 사진의 exclude도 [복구]와 같이 모두 지워요. 사진 없는 보정이 남지 않고 Journey를 다시 계산해요.
        <ExcludedTab
          photos={excludedPhotos}
          status={correctionStatus}
          canEdit={canEdit}
          onRestore={handleRestore}
          onBeforeDelete={handleMoveAnchors}
          onDeleted={handleRestore}
        />
      )}
      {tab === 'unlocated' && (
        <UnlocatedTab
          groups={unlocatedGroups}
          canExclude={canEdit}
          onExclude={handleExcludeMany}
        />
      )}
    </main>
  );
}
