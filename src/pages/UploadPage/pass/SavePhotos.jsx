import { Navigate } from 'react-router';

import { useAuthStore } from '@/stores/authStore';
import { useUploadStore } from '@/stores/upload/uploadStore';

const PLACE_PATH = '/places';

/**
 * 정리가 끝난 사진을 저장하고, 이미지를 다 올리면 03 전체 기록으로 넘어가요(#142).
 *
 * 호출: PassPhotosStep이 "다 정리했어요"일 때 그려요.
 * <SavePhotos />
 *
 * 의도: 올리는 진행은 원래 03의 회색 한 줄(#27)이 보여 줄 자리인데 아직 없어요.
 * 그래서 이미지를 다 올릴 때까지 이 화면에 남아 진행을 보여 주고, 못 올린 장이 있어도 끝나면 넘어가요.
 * 올리기 숫자는 장마다 바뀌어서, 이 컴포넌트만 구독하게 나눴어요.
 */
export default function SavePhotos() {
  const ownerId = useAuthStore((state) => state.user?.id);
  const save = useUploadStore((state) => state.save);
  const saveStatus = useUploadStore((state) => state.saveStatus);
  const saveResult = useUploadStore((state) => state.saveResult);
  const imageUpload = useUploadStore((state) => state.imageUpload);

  if (saveStatus === 'saved') {
    const done = imageUpload.uploaded + imageUpload.skipped + imageUpload.failed;

    // save는 'saved'를 쓴 직후 같은 흐름에서 uploadImages가 total을 채워서, 0 / 0으로 먼저 넘어가지 않습니다.
    // 올릴 게 없으면(다 빼 뒀거나 미리 볼 수 없는 사진뿐) 바로 넘어갑니다.
    // 뒤로 가기로 다 끝난 정리 화면에 돌아오지 않게 replace로 넘어갑니다.
    if (done >= imageUpload.total) return <Navigate to={PLACE_PATH} replace />;

    return (
      <div className="mt-6 text-md text-muted">
        <p>
          {saveResult.saved}장 저장했어요
          {saveResult.existing > 0 && ` · ${saveResult.existing}장은 이미 있어요`}
        </p>
        <p className="mt-1">
          이미지 올리는 중 {done} / {imageUpload.total}
          {imageUpload.failed > 0 && ` · ${imageUpload.failed}장은 못 올렸어요`}
        </p>
      </div>
    );
  }

  const isSaving = saveStatus === 'saving';
  const isFailed = saveStatus === 'failed';
  const label = isFailed ? '다시 시도' : '여행 보기';

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={isSaving || !ownerId}
        onClick={() => void save(ownerId)}
        className="h-14 w-45 bg-nav text-lg font-bold text-white disabled:opacity-60"
      >
        {isSaving ? '저장하는 중…' : label}
      </button>
      {isFailed && (
        <p role="alert" className="mt-3 text-md text-muted">
          저장하지 못했어요. 다시 시도해 주세요
        </p>
      )}
    </div>
  );
}
