import { useUploadStore } from '@/stores/upload/uploadStore';
import { cn } from '@/utils/cn';
import { getPassKind } from '@/utils/upload/pass/getPassKind';

// 가운데 사진 양옆으로 몇 장씩 그릴지. 300장을 다 그리지 않으려고 둡니다.
const SIDE_COUNT = 6;
// 지나간 사진 한 칸의 폭(w-51, 204px)과 칸 사이(gap-3, 12px). 가운데 사진을 화면 가운데에 두는 데 써요.
const CELL_STEP = 216;
// 가운데 사진 칸 폭(w-62, 248px)의 절반
const CURRENT_HALF = 124;
// 지금 사진을 어떻게 처리하는지 사진 줄 위에 보여 주는 말입니다.
const KIND_LABELS = { auto: '그냥 넣음', show: '편집본 · 천천히' };

/**
 * 사진이 시간순 한 줄로 지나가는 줄이에요. 가운데(currentIndex) 한 장만 크게 보여요.
 *
 * 호출: PassPhotosStep 머리말 아래에서 그려요.
 * <PassStrip currentIndex={0} />
 *
 * @param {object} props
 * @param {number} props.currentIndex 지금 지나가는 사진의 순서
 */
export default function PassStrip({ currentIndex }) {
  const photos = useUploadStore((state) => state.photos);
  const start = Math.max(0, currentIndex - SIDE_COUNT);
  const visiblePhotos = photos.slice(start, currentIndex + SIDE_COUNT + 1);
  // 줄의 왼쪽 끝을 화면 가운데에 두고, 가운데 사진 앞의 칸 수만큼 왼쪽으로 당겨요.
  const offset = (currentIndex - start) * CELL_STEP + CURRENT_HALF;
  const currentPhoto = photos[currentIndex];

  return (
    // 사진 줄만 바깥 여백으로 확장해 문서 전체에 가로 스크롤이 생기지 않게 합니다.
    <div className="relative -mx-6 overflow-hidden mask-x-from-85% pt-3 pb-4 lg:-mx-16">
      {/* 지금 위치를 가리키는 세로선. 가운데 사진 뒤로 지나가요 */}
      <span className="absolute top-0 left-1/2 h-16 w-px -translate-x-1/2 bg-accent/40" />
      {/* 지금 사진의 처리 방식. 사진이 0장이면 getPassKind에 넘길 사진이 없어서 그리지 않아요 */}
      {currentPhoto && (
        <p className="relative mx-auto w-fit rounded-pill bg-accent px-3 py-1 text-xs font-medium text-white">
          {KIND_LABELS[getPassKind(currentPhoto)]}
        </p>
      )}
      <ol
        className="relative left-1/2 mt-4 flex w-max items-center gap-3"
        style={{ marginLeft: -offset }}
      >
        {visiblePhotos.map((photo, index) => {
          const isCurrent = start + index === currentIndex;
          return (
            <li
              key={photo.id}
              aria-current={isCurrent ? 'true' : 'false'}
              className={cn('bg-white p-3', isCurrent ? 'w-62 shadow-lg' : 'w-51')}
            >
              {photo.src ? (
                <img
                  src={photo.src}
                  alt=""
                  className={cn(
                    'object-cover',
                    isCurrent ? 'size-56 outline-2 -outline-offset-2 outline-accent' : 'size-45',
                  )}
                />
              ) : (
                <div className={cn('bg-line', isCurrent ? 'size-56' : 'size-45')} />
              )}
              {/* 촬영 시각이 스토어에 생기면 날짜(07.03 10:15)로 바뀝니다. */}
              <p
                className={cn(
                  'mt-2 truncate font-mono text-sm',
                  isCurrent ? 'text-accent' : 'text-dim',
                )}
              >
                {photo.filename}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
