import { useUploadStore } from '@/stores/upload/uploadStore';

// 더미에 그릴 장 수. 겉으로 15~20장쯤 보이게 넓게 흩되, 300장을 다 그리지 않고 최근 것만 그립니다.
const VISIBLE_COUNT = 24;

// 흩어지는 범위. 가로·세로는 상자 폭 기준(cqw), 기울기는 deg입니다.
// 가로 34는 카드(24cqw)를 12deg 기울였을 때 상자 폭 안에 들어오는 끝값이라, 왼쪽 글자 칸을 넘지 않습니다.
const SPREAD_X = 34;
const SPREAD_Y = 22;
const SPREAD_ROTATE = 12;

// 같은 seed면 늘 같은 0~1 값을 줍니다. 셰이더에서 흔히 쓰는 sin 해시라, 이웃한 seed끼리도 값이 크게 달라집니다.
const pseudoRandom = (seed) => {
  const value = Math.sin(seed) * 43758.5453;
  return value - Math.floor(value);
};

// 더미를 나누는 격자. 6×4 = VISIBLE_COUNT칸이라, 그리는 24장이 한 칸에 한 장씩 앉습니다.
const GRID_COLS = 6;
const GRID_ROWS = 4;
// 몇 칸씩 건너뛰며 앉힐지. 24와 서로소라 24장이 모든 칸을 한 번씩 거치고, 이어 받은 사진은 멀리 떨어진 칸에 놓입니다.
const SLOT_STEP = 11;
// 칸 안에서 흔드는 정도(칸 크기 대비). 0.4면 이웃 칸과 살짝 겹칠 만큼 흔들려 격자 줄이 안 보입니다.
const JITTER = 0.4;

// 고른 순서로 카드 자리·기울기를 정합니다.
// 칸을 나누지 않고 무작위로만 정하면 24장이 한쪽에 몰리고 빈 곳이 생겨서, 칸을 정한 뒤 칸 안에서만 흔듭니다.
const scatterOf = (order) => {
  const cell = (order * SLOT_STEP) % (GRID_COLS * GRID_ROWS);
  const col = cell % GRID_COLS;
  const row = Math.floor(cell / GRID_COLS);
  const jitterX = (pseudoRandom(order * 12.9898) - 0.5) * 2 * JITTER;
  const jitterY = (pseudoRandom(order * 78.233) - 0.5) * 2 * JITTER;
  return {
    x: (((col + 0.5 + jitterX) / GRID_COLS) * 2 - 1) * SPREAD_X,
    y: (((row + 0.5 + jitterY) / GRID_ROWS) * 2 - 1) * SPREAD_Y,
    rotate: (pseudoRandom(order * 37.719) * 2 - 1) * SPREAD_ROTATE,
  };
};

/**
 * 고른 사진이 폴라로이드처럼 포개지는 더미(#87)
 *
 * 책임: 스토어의 사진을 순서대로 겹쳐 그립니다. 나중에 받은 사진이 위에 놓입니다.
 * 호출: PilePhotosStep(오른쪽)
 *
 * 의도: 사진마다 위치·각도를 조금씩 다르게 줘서 손으로 던져 놓은 것처럼 보이게 합니다.
 * 무작위로 정하면 다시 그릴 때마다 사진이 튀어서, 고른 순서(photo.order)를 seed로 늘 같은 자리를 구합니다(scatterOf).
 * 전에는 가로·세로를 sin·cos 한 번씩으로 정했는데 하트 같은 일정한 무늬가 생겼고,
 * 무작위로만 정하면 한쪽에 몰리고, 원 안에 나선으로 앉히면 가운데로 뭉쳐 보여서, 격자 칸 안에서 흔드는 방식으로 정했습니다.
 * 흩어지는 범위는 위의 SPREAD_* 상수입니다.
 * map의 index는 쓰지 않습니다. 앞 사진이 빠지면 index가 가리키는 사진도 바뀌기 때문입니다.
 * 크기는 상자 폭 기준(cqw)이라 상자가 줄면 카드와 흩어진 거리도 같이 줄어듭니다.
 * 상자 높이도 폭 비율(4:3)로 둬서, 화면 폭이 바뀌어도 세로로 흩어진 카드가 상자 밖으로 나가지 않습니다.
 *
 * 주의할 점:
 *  - 들어오는 움직임(animate-photo-pile)은 transform을 덮어써서, 같은 위치를 --pile-* 변수로 넘겨 tokens.css의 keyframes와 맞춥니다.
 */
export default function PhotoPile() {
  const photos = useUploadStore((state) => state.photos);

  return (
    <section
      aria-label="고른 사진 더미"
      className="@container relative mx-auto aspect-[4/3] w-full max-w-190"
    >
      {photos.slice(-VISIBLE_COUNT).map((photo) => {
        const scatter = scatterOf(photo.order);
        return (
          <figure
            key={photo.id}
            className="absolute top-1/2 left-1/2 w-[24cqw] bg-white p-[2cqw] pb-[5cqw] shadow-lg motion-safe:animate-photo-pile"
            style={{
              '--pile-x': `${scatter.x}cqw`,
              '--pile-y': `${scatter.y}cqw`,
              '--pile-r': `${scatter.rotate}deg`,
              transform:
                'translate(calc(-50% + var(--pile-x)), calc(-50% + var(--pile-y))) rotate(var(--pile-r))',
            }}
          >
            {/* 브라우저가 못 그린 사진(src: null)은 회색 칸으로 둡니다. 회색은 PhotoGridCell과 같은 bg-line입니다. */}
            {photo.src ? (
              <img
                src={photo.src}
                alt={photo.filename}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div
                role="img"
                aria-label={`${photo.filename} · 미리 볼 수 없는 사진`}
                className="aspect-square w-full bg-line"
              />
            )}
            {/* 글자 크기도 카드처럼 상자 폭(cqw)을 따라갑니다. 1.4cqw는 상자 760px일 때 약 10.6px입니다.
              너무 작아지지 않게 10px 아래로는 안 줄입니다. */}
            <figcaption className="mt-[3cqw] truncate font-mono text-[max(10px,1.4cqw)] leading-normal text-body">
              {photo.filename.replace(/\.[^.]+$/, '')}
            </figcaption>
          </figure>
        );
      })}
    </section>
  );
}
