import { useUploadStore } from '@/stores/upload/uploadStore';
import { formatSkippedCounts } from '@/utils/upload/formatSkippedCounts';

import PhotoPile from './PhotoPile';

/**
 * 잘못 고른 폴더를 바로 바꿀 수 있도록 사진을 모으는 중에도 [다시 고르기]를 보여 줘요.
 *
 * @param {object} props
 * @param {() => void} props.onReset [다시 고르기]를 누르면 불러요. 13a″로 돌아가요
 * @param {() => void} props.onNext 다 모은 뒤 [다음]을 누르면 불러요. 13h″로 넘어가요
 */
export default function PilePhotosStep({ onReset, onNext }) {
  const photoCount = useUploadStore((state) => state.photos.length);
  const totalCount = useUploadStore((state) => state.files.length);
  const noPreviewCount = useUploadStore((state) => state.noPreviewCount);
  const skippedFiles = useUploadStore((state) => state.skippedFiles);
  const isDone = useUploadStore((state) => state.isDone);
  const stopCollecting = useUploadStore((state) => state.stopCollecting);

  return (
    <main className="flex flex-1 flex-col justify-center bg-canvas">
      <div className="mx-auto grid w-full max-w-360 grid-cols-[auto_1fr] items-center gap-10 px-30 py-14 2xl:max-w-400">
        <header>
          <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
            STEP 2 / 2 · 모으기
          </p>
          <h1 className="mt-3 text-6xl font-bold text-ink 2xl:text-7xl">
            {isDone ? '사진을 다 모았어요' : '사진을 모으고 있어요'}
          </h1>
          {/* 숫자는 사진마다 바뀌어서 화면 읽기 프로그램에 알리지 않습니다(role="status"를 달면 300장이면 300번 읽음).
              알림은 아래 sr-only 문구 하나가 "다 모았을 때" 한 번만 합니다. */}
          <p className="mt-8 flex items-baseline gap-4">
            <strong className="font-serif text-8xl font-bold text-ink">{photoCount}</strong>
            <span className="text-xl text-muted">/ {totalCount}장</span>
          </p>
          {noPreviewCount > 0 && (
            <p className="mt-3 text-md text-muted">
              미리 볼 수 없는 사진 {noPreviewCount}장은 회색으로 보여요
            </p>
          )}
          {/* 고르기 화면은 사진이 있으면 곧바로 사라져서, 일부만 뺀 것은 이 화면에서 알립니다(U109). */}
          {skippedFiles.length > 0 && (
            <p className="mt-3 text-md text-muted">{formatSkippedCounts(skippedFiles)}는 뺐어요</p>
          )}
          {/* 화면에는 안 보이고 화면 읽기 프로그램만 읽는 알림입니다. 처음엔 비워 두고 다 모았을 때 한 번만 채웁니다.
              live 영역은 내용이 "바뀔 때" 읽어서, 처음부터 글자가 있으면 읽지 않는 브라우저가 있습니다. */}
          <p role="status" className="sr-only">
            {isDone &&
              `사진 ${photoCount}장을 다 모았어요.${noPreviewCount > 0 ? ` 미리 볼 수 없는 사진 ${noPreviewCount}장이 있어요.` : ''}`}
          </p>
          {/* 한 장도 안 모였으면 [다시 고르기]만 보입니다.
              멈추면 같은 버튼이 [다음]으로 바뀌어서, 키보드 포커스가 그 자리에 남습니다. */}
          <div className="mt-10 flex flex-col items-start gap-4">
            {(isDone || photoCount > 0) && (
              <button
                type="button"
                onClick={isDone ? onNext : stopCollecting}
                className="h-14 w-45 bg-nav text-lg font-bold text-white"
              >
                {isDone ? '다음' : '여기까지만 모으기'}
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="h-14 w-45 border border-nav bg-white text-lg font-medium text-ink"
            >
              다시 고르기
            </button>
          </div>
        </header>
        <PhotoPile />
      </div>
    </main>
  );
}
