import { useUploadStore } from '@/stores/upload/uploadStore';
import { cn } from '@/utils/cn';
import { getPassKind } from '@/utils/upload/pass/getPassKind';

// 가운데 사진 양옆으로 몇 장씩 그릴지. 300장을 다 그리지 않으려고 둡니다.
const SIDE_COUNT = 6;
// 지나간 사진 한 칸의 폭(w-51, 204px)과 칸 사이(gap-3, 12px). 가운데 사진을 화면 가운데에 두는 데 써요.
const CELL_STEP = 216;
// 칸 폭(w-51, 204px)의 절반. 가운데 사진의 한가운데를 화면 가운데에 맞추는 데 써요.
const CELL_HALF = 102;
// 지금 사진을 어떻게 처리하는지 사진 줄 위에 보여 주는 말입니다.
const KIND_LABELS = {
  auto: '시간순으로 넣어요',
  show: '편집본은 원본 옆에 둬요',
  ask: '끝에서 물어볼게요',
};

/**
 * 손글씨(PassTimeline) 그라데이션에서 position(0 ~ 1) 자리의 색이에요.
 * 그라데이션과 같은 세 토큰을 같은 방식(srgb)으로 섞어요.
 * @param {number} position
 * @returns {string} CSS 색
 */
function getJourneyColor(position) {
  if (position <= 0.5) {
    return `color-mix(in srgb, var(--color-accent) ${position * 200}%, var(--color-journey-start))`;
  }
  return `color-mix(in srgb, var(--color-journey-end) ${(position - 0.5) * 200}%, var(--color-accent))`;
}

/**
 * 사진이 시간순 한 줄로 지나가는 줄이에요. 가운데(currentIndex) 사진에 테두리를 둘러요.
 * 편집본과 물어볼 사진은 카드 배경을 손글씨에서 그 자리의 색으로 칠해요. 크기나 속도를 바꾸면 줄이 꿀렁거리거나
 * 흐름이 끊겨서, 모든 사진을 같은 크기·같은 빠르기로 두고 색으로만 구분해요.
 *
 * 묻는 중(isAsking)에는 13i″처럼 지금 칸을 점선으로 비우고 사진을 줄 위로 띄워요.
 * 어느 사진을 묻는지와 줄 어디쯤인지가 같이 보이게 하려고, 질문을 따로 모으지 않고 줄로 돌아와요.
 *
 * 호출: PassPhotosStep 머리말 아래에서 그려요.
 * <PassStrip currentIndex={0} moveMs={600} isAsking={false} />
 *
 * @param {object} props
 * @param {number} props.currentIndex 지금 지나가는 사진의 순서
 * @param {number} props.moveMs 다음 장으로 옮겨 가는 시간
 * @param {boolean} props.isAsking 지금 사진을 물어보는 중인지
 */
export default function PassStrip({ currentIndex, moveMs, isAsking }) {
  const photos = useUploadStore((state) => state.photos);
  const answers = useUploadStore((state) => state.passAnswers);
  const start = Math.max(0, currentIndex - SIDE_COUNT);
  const visiblePhotos = photos.slice(start, currentIndex + SIDE_COUNT + 1);
  // 잘라 낸 앞 사진 자리만큼 여백을 둬서, 이동 거리를 전체 순서로 셀 수 있게 합니다.
  // 화면 안 순서로 세면 7번째 장부터 값이 그대로라 transition이 걸리지 않습니다.
  const skippedWidth = start * CELL_STEP;
  const currentPhoto = photos[currentIndex];
  const offset = currentIndex * CELL_STEP + CELL_HALF;

  return (
    // 사진 줄만 바깥 여백으로 확장해 문서 전체에 가로 스크롤이 생기지 않게 합니다.
    <div className="relative -mx-6 overflow-hidden mask-x-from-85% pt-3 pb-4 lg:-mx-16">
      {/* 지금 위치를 가리키는 세로선. 가운데 사진 뒤로 지나가요 */}
      <span className="absolute top-0 left-1/2 h-16 w-px -translate-x-1/2 bg-accent/40" />
      {/* 묻는 사진은 줄 위로 띄워요. 아래 점선 칸에 살짝 걸치게 해서 어디서 빠져나왔는지 보여요 */}
      {isAsking && currentPhoto && (
        <div className="relative z-10 mx-auto -mb-12 w-51 -rotate-2 border-2 border-accent bg-white p-3 shadow-lg">
          {currentPhoto.src ? (
            <img src={currentPhoto.src} alt="" className="size-45 object-cover" />
          ) : (
            <div className="size-45 bg-line" />
          )}
          <p className="mt-2 truncate font-mono text-sm text-ink">{currentPhoto.filename}</p>
        </div>
      )}
      {/* 지금 사진의 처리 방식. 사진이 0장이면 getPassKind에 넘길 사진이 없어서 그리지 않아요 */}
      {!isAsking && currentPhoto && (
        <p className="relative mx-auto w-fit rounded-pill bg-accent px-5 py-2 text-xl font-bold text-white">
          {KIND_LABELS[getPassKind(currentPhoto)]}
        </p>
      )}
      <ol
        className="relative left-1/2 mt-4 flex w-max items-center gap-3 transition-transform ease-linear motion-reduce:transition-none"
        style={{
          paddingLeft: skippedWidth,
          transform: `translateX(${-offset}px)`,
          transitionDuration: `${moveMs}ms`,
        }}
      >
        {visiblePhotos.map((photo, index) => {
          const order = start + index;
          const isCurrent = order === currentIndex;
          // 편집본과 물어볼 사진은 그냥 넣는 사진이 아니라서 색 카드로 눈에 띄게 해요.
          const isColored = getPassKind(photo) !== 'auto';
          if (isCurrent && isAsking) {
            // 칸 크기는 다른 칸과 같게 둬서 줄이 꿀렁거리지 않아요.
            return (
              <li
                key={photo.id}
                aria-current="true"
                className="flex w-51 items-end justify-center self-stretch border-2 border-dashed border-accent pb-3"
              >
                <span className="text-sm font-bold text-accent">여기</span>
              </li>
            );
          }
          return (
            <li
              key={photo.id}
              aria-current={isCurrent ? 'true' : 'false'}
              // 빼 둔 사진은 자리는 그대로 두고 흐리게 그려요. 빼면 줄이 당겨지며 다른 사진이 움직여요.
              className={cn(
                'w-51 p-3',
                !isColored && 'bg-white',
                answers[photo.id] === 'exclude' && 'opacity-30 grayscale',
              )}
              style={
                isColored
                  ? {
                      backgroundColor: getJourneyColor(
                        photos.length > 1 ? order / (photos.length - 1) : 0,
                      ),
                    }
                  : undefined
              }
            >
              {photo.src ? (
                <img
                  src={photo.src}
                  alt=""
                  className={cn(
                    'size-45 object-cover',
                    isCurrent && 'outline-2 -outline-offset-2 outline-accent',
                  )}
                />
              ) : (
                <div className="size-45 bg-line" />
              )}
              {/* 촬영 시각이 스토어에 생기면 날짜(07.03 10:15)로 바뀝니다. */}
              <p
                className={cn(
                  'mt-2 truncate font-mono text-sm',
                  isColored ? 'text-white' : isCurrent ? 'text-accent' : 'text-dim',
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
