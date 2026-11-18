import { Navigate } from 'react-router';

import { PHOTO_SORT_PATH, SORT_TAB_PARAM } from '@/constants/photoSort';

import { useAuthStore } from '@/stores/authStore';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { getTripPath } from '@/utils/stopPath';

const PLACE_PATH = '/places';
// [사진 정리하기]는 07의 위치 확인 필요 탭으로 보내요(피그마 13c 동작 메모).
const SORT_UNLOCATED_PATH = `${PHOTO_SORT_PATH}?${SORT_TAB_PARAM}=unlocated`;

/**
 * 정리가 끝난 사진을 저장하고, 이미지를 다 올리고 Journey를 저장하면 03 전체 기록의 이번 여행 탭으로 넘어가요
 * (#142, #144, #150). 새로 저장한 사진이 든 여행이 없으면(전부 이미 있던 사진 등) 탭을 고르지 않고 넘어가요.
 *
 * 호출: PassPhotosStep이 "다 정리했어요"일 때 그려요.
 * <SavePhotos />
 *
 * 의도: 올리는 진행은 원래 03의 회색 한 줄(#27)이 보여 줄 자리인데 아직 없어요.
 * 그래서 이미지를 다 올릴 때까지 이 화면에 남아 진행을 보여 주고, 못 올린 장이 있어도 끝나면 넘어가요.
 * 03·지도는 journeys에 저장된 Journey를 읽어서, Journey를 다 쓴 뒤에 넘어가야 새 여행이 보여요.
 * Journey를 못 만들면 사진은 저장된 채로 Journey만 다시 만들게 해요.
 * 올리기 숫자는 장마다 바뀌어서, 이 컴포넌트만 구독하게 나눴어요.
 * [사진 정리하기]도 [여행 보기]처럼 저장부터 하고, 다 끝나면 03 대신 07 위치 확인 필요 탭으로 가요(피그마 13c).
 * 어느 버튼으로 저장했는지(saveTarget)는 저장 상태와 같이 스토어에 둬요. 저장 중에 페이지를 나갔다 와도
 * 고른 곳으로 가요. 실패한 뒤 [다시 시도]는 처음 고른 곳으로 가요.
 */
export default function SavePhotos() {
  const ownerId = useAuthStore((state) => state.user?.id);
  const save = useUploadStore((state) => state.save);
  const refreshJourney = useUploadStore((state) => state.refreshJourney);
  const saveStatus = useUploadStore((state) => state.saveStatus);
  const saveResult = useUploadStore((state) => state.saveResult);
  const imageUpload = useUploadStore((state) => state.imageUpload);
  const journeyStatus = useUploadStore((state) => state.journeyStatus);
  const newTripId = useUploadStore((state) => state.newTripId);
  const saveTarget = useUploadStore((state) => state.saveTarget);
  const goesToSort = saveTarget === 'sort';

  if (saveStatus === 'saved') {
    const done = imageUpload.uploaded + imageUpload.skipped + imageUpload.failed;
    // save는 'saved'를 쓴 직후 같은 흐름에서 uploadImages가 total을 채워서, 0 / 0으로 먼저 넘어가지 않습니다.
    // 올릴 게 없으면(다 빼 뒀거나 미리 볼 수 없는 사진뿐) 이미지는 바로 끝난 것으로 봅니다.
    const isUploaded = done >= imageUpload.total;

    // 뒤로 가기로 다 끝난 정리 화면에 돌아오지 않게 replace로 넘어갑니다.
    if (isUploaded && journeyStatus === 'saved') {
      const tripPath = newTripId ? getTripPath(newTripId) : PLACE_PATH;
      return <Navigate to={goesToSort ? SORT_UNLOCATED_PATH : tripPath} replace />;
    }

    return (
      <div className="mt-6 text-md text-muted">
        <p>
          {saveResult.saved}장 저장했어요
          {saveResult.existing > 0 && ` · ${saveResult.existing}장은 이미 있어요`}
        </p>
        <p className="mt-1">
          {isUploaded ? '이미지를 다 올렸어요' : `이미지 올리는 중 ${done} / ${imageUpload.total}`}
          {imageUpload.failed > 0 && ` · ${imageUpload.failed}장은 못 올렸어요`}
        </p>
        {journeyStatus === 'building' && <p className="mt-1">여행을 정리하는 중…</p>}
        {journeyStatus === 'failed' && (
          <div className="mt-3">
            <p role="alert">여행을 만들지 못했어요. 사진은 저장돼 있어요</p>
            <button
              type="button"
              disabled={!ownerId}
              onClick={() => void refreshJourney(ownerId)}
              className="mt-2 h-12 w-40 bg-nav text-md font-bold text-white disabled:opacity-60"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    );
  }

  const isSaving = saveStatus === 'saving';
  const isFailed = saveStatus === 'failed';
  const label = isFailed ? '다시 시도' : '여행 보기';
  const canSave = !isSaving && Boolean(ownerId);

  return (
    <div className="mt-6">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void save(ownerId, isFailed ? saveTarget : 'trip')}
          className="h-14 w-45 bg-nav text-lg font-bold text-white disabled:opacity-60"
        >
          {isSaving && !goesToSort ? '저장하는 중…' : label}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void save(ownerId, 'sort')}
          className="h-14 border border-ink px-6 text-lg font-bold text-ink disabled:opacity-60"
        >
          {isSaving && goesToSort ? '저장하는 중…' : '사진 정리하기'}
        </button>
      </div>
      {isFailed && (
        <p role="alert" className="mt-3 text-md text-muted">
          저장하지 못했어요. 다시 시도해 주세요
        </p>
      )}
    </div>
  );
}
