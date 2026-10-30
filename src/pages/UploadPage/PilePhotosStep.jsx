import { usePhotoAssembly } from '@/hooks/upload/usePhotoAssembly';
import { usePhotoThumbnails } from '@/hooks/upload/usePhotoThumbnails';

import PhotoPile from './PhotoPile';

/**
 * 고른 사진이 포개지며 쌓이는 화면 (13a″ 다음, 13h″ 전, #87)
 *
 * 책임: 고른 사진을 썸네일로 줄여 오른쪽 더미에 한 장씩 쌓고, 몇 장 모였는지 보여 줍니다.
 * 사용자는 보기만 하고 누를 건 없습니다.
 *
 * 호출: UploadPage가 고른 사진이 있을 때 그립니다.
 * <PilePhotosStep files={photoFiles} />
 *
 * 의도: 13b″(읽으면서 미리보기)·13c″(다 읽음)를 없애고 이 화면 하나로 대신합니다.
 * @param {object} props
 * @param {File[]} props.files 13a″에서 고르고 거른 사진 파일 목록. 바뀌지 않는 같은 배열이어야 해요
 */
export default function PilePhotosStep({ files }) {
  const { photos, failedCount, isDone } = usePhotoThumbnails(files);
  const count = usePhotoAssembly(photos.length);
  const isPiled = isDone && count >= photos.length;

  // TODO(titanfall7274): 13h″ 지나가며 정리 이슈가 생기면 isPiled일 때 넘어가기
  return (
    <main className="flex flex-1 flex-col justify-center bg-canvas">
      <div className="mx-auto grid w-full max-w-360 items-center gap-10 px-4 py-10 md:grid-cols-[auto_1fr] lg:px-30 lg:py-14 2xl:max-w-400">
        <header>
          <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
            STEP 2 / 2 · 모으기
          </p>
          <h1 className="mt-3 text-6xl font-bold text-ink 2xl:text-7xl">
            {isPiled ? '사진을 다 모았어요' : '사진을 모으고 있어요'}
          </h1>
          <p className="mt-8 flex items-baseline gap-4" role="status">
            <strong className="font-serif text-8xl font-bold text-ink">{count}</strong>
            <span className="text-xl text-muted">/ {files.length}장</span>
          </p>
          {failedCount > 0 && (
            <p className="mt-3 text-md text-muted">
              열 수 없는 사진 {failedCount}장은 건너뛰었어요
            </p>
          )}
        </header>
        <PhotoPile photos={photos.slice(0, count)} />
      </div>
    </main>
  );
}
