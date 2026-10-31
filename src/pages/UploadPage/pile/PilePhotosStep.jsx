import { useUploadStore } from '@/stores/upload/uploadStore';

import PhotoPile from './PhotoPile';

/**
 * 고른 사진이 포개지며 쌓이는 화면 (13a″ 다음, 13h″ 전, #87)
 *
 * 책임: 스토어에 준비된 사진 수와 미리 볼 수 없는 수를 보여 줍니다.
 * 사용자는 보기만 하면 되고, 잘못 골랐을 때만 [다시 고르기]를 누릅니다.
 *
 * 호출: UploadPage가 고른 사진이 있을 때 그립니다.
 * <PilePhotosStep onReset={handleReset} />
 *
 * 의도: 13b″(읽으면서 미리보기)·13c″(다 읽음)를 없애고 이 화면 하나로 대신합니다.
 * [다시 고르기]는 13c″에 작은 링크로 있던 것을 옮겨 왔습니다. 깨진 파일만 골랐거나 폴더를 잘못 골랐을 때
 * 13a″로 돌아갈 길이 이것뿐이라, 다 모으기 전에도 늘 보여 줍니다.
 * @param {object} props
 * @param {() => void} props.onReset [다시 고르기]를 누르면 불러요. 13a″로 돌아가요
 */
export default function PilePhotosStep({ onReset }) {
  const photoCount = useUploadStore((state) => state.photos.length);
  const totalCount = useUploadStore((state) => state.files.length);
  const noPreviewCount = useUploadStore((state) => state.noPreviewCount);
  const isDone = useUploadStore((state) => state.isDone);

  // TODO(titanfall7274): 13h″ 지나가며 정리 이슈가 생기면 isDone일 때 넘어가기
  return (
    <main className="flex flex-1 flex-col justify-center bg-canvas">
      <div className="mx-auto grid w-full max-w-360 items-center gap-10 px-4 py-10 md:grid-cols-[auto_1fr] lg:px-30 lg:py-14 2xl:max-w-400">
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
          {/* 화면에는 안 보이고 화면 읽기 프로그램만 읽는 알림입니다. 처음엔 비워 두고 다 모았을 때 한 번만 채웁니다.
              live 영역은 내용이 "바뀔 때" 읽어서, 처음부터 글자가 있으면 읽지 않는 브라우저가 있습니다. */}
          <p role="status" className="sr-only">
            {isDone &&
              `사진 ${photoCount}장을 다 모았어요.${noPreviewCount > 0 ? ` 미리 볼 수 없는 사진 ${noPreviewCount}장이 있어요.` : ''}`}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-10 text-md text-muted underline underline-offset-4"
          >
            다시 고르기
          </button>
        </header>
        <PhotoPile />
      </div>
    </main>
  );
}
