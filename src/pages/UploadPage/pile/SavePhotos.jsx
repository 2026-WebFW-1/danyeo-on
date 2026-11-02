import { useAuthStore } from '@/stores/authStore';
import { useUploadStore } from '@/stores/upload/uploadStore';

/**
 * 다 모은 사진을 저장하고, 뒤에서 올라가는 이미지 수를 보여 줘요(#26).
 *
 * 호출: PilePhotosStep이 사진을 다 모았을 때 그려요.
 *
 * 의도: 원래는 13h″ 정리 뒤 저장하고 03으로 넘어가, 진행은 03의 회색 한 줄(#27)이 보여 줘요.
 * 둘 다 아직 없어서 저장 버튼과 진행 줄을 임시로 이 화면에 둬요.
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
    return (
      <div className="mt-10 text-md text-muted">
        <p>
          {saveResult.saved}장 저장했어요
          {saveResult.existing > 0 && ` · ${saveResult.existing}장은 이미 있어요`}
        </p>
        <p className="mt-1">
          {done < imageUpload.total
            ? `이미지 올리는 중 ${done} / ${imageUpload.total}`
            : '이미지를 다 올렸어요'}
          {imageUpload.failed > 0 && ` · ${imageUpload.failed}장은 못 올렸어요`}
        </p>
      </div>
    );
  }

  const isSaving = saveStatus === 'saving';
  return (
    <div className="mt-10">
      <button
        type="button"
        disabled={isSaving || !ownerId}
        onClick={() => void save(ownerId)}
        className="h-14 w-45 bg-nav text-lg font-bold text-white disabled:opacity-60"
      >
        {isSaving ? '저장하는 중…' : '저장하기'}
      </button>
      {saveStatus === 'failed' && (
        <p role="alert" className="mt-3 text-md text-muted">
          저장하지 못했어요. 다시 눌러 주세요
        </p>
      )}
    </div>
  );
}
