import { useUploadStore } from '@/stores/upload/uploadStore';

// 더미에 그릴 장 수. 겉으로 15~20장쯤 보이게 넓게 흩되, 300장을 다 그리지 않고 최근 것만 그립니다.
const VISIBLE_COUNT = 24;

// 흩어지는 범위. 가로·세로는 상자 폭 기준(cqw), 기울기는 deg입니다.
// 가로 32는 카드(28cqw)를 12deg 기울였을 때 상자 폭 안에 들어오는 끝값이라, 왼쪽 글자 칸을 넘지 않습니다.
const SPREAD_X = 32;
const SPREAD_Y = 12;
const SPREAD_ROTATE = 12;

/**
 * 고른 사진이 폴라로이드처럼 포개지는 더미(#87)
 *
 * 책임: 스토어의 사진을 순서대로 겹쳐 그립니다. 나중에 받은 사진이 위에 놓입니다.
 * 호출: PilePhotosStep(오른쪽)
 *
 * 의도: 사진마다 위치·각도를 조금씩 다르게 줘서 손으로 던져 놓은 것처럼 보이게 합니다.
 * 무작위로 정하면 다시 그릴 때마다 사진이 튀어서, 고른 순서(photo.order)로 sin·cos 값을 구합니다.
 * 곱하는 수(2.399, 1.37, 4.117)는 이웃한 사진끼리 비슷한 자리에 겹치지 않게 고른 값이고,
 * 흩어지는 범위는 위의 SPREAD_* 상수입니다.
 * map의 index는 쓰지 않습니다. 앞 사진이 빠지면 index가 가리키는 사진도 바뀌기 때문입니다.
 * 크기는 상자 폭 기준(cqw)이라 상자가 줄면 카드와 흩어진 거리도 같이 줄어듭니다.
 * 상자 높이도 폭 비율(16:10)로 둬서, 화면 폭이 바뀌어도 세로로 흩어진 카드가 상자 밖으로 나가지 않습니다.
 *
 * 주의할 점:
 *  - 들어오는 움직임(animate-photo-pile)은 transform을 덮어써서, 같은 위치를 --pile-* 변수로 넘겨 tokens.css의 keyframes와 맞춥니다.
 */
export default function PhotoPile() {
  const photos = useUploadStore((state) => state.photos);

  return (
    <section
      aria-label="고른 사진 더미"
      className="@container relative mx-auto aspect-[16/10] w-full max-w-190"
    >
      {photos.slice(-VISIBLE_COUNT).map((photo) => (
        <figure
          key={photo.id}
          className="absolute top-1/2 left-1/2 w-[28cqw] bg-white p-[2cqw] pb-[5cqw] shadow-lg motion-safe:animate-photo-pile"
          style={{
            '--pile-x': `${Math.sin(photo.order * 2.399) * SPREAD_X}cqw`,
            '--pile-y': `${Math.cos(photo.order * 1.37) * SPREAD_Y}cqw`,
            '--pile-r': `${Math.sin(photo.order * 4.117) * SPREAD_ROTATE}deg`,
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
      ))}
    </section>
  );
}
