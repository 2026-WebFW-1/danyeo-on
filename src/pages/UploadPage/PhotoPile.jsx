/**
 * 고른 사진이 폴라로이드처럼 포개지는 더미(#87)
 *
 * 책임: 받은 사진을 순서대로 겹쳐 그립니다. 나중에 받은 사진이 위에 놓입니다.
 * 호출: PilePhotosStep(오른쪽)
 *
 * 의도: 사진마다 위치·각도를 조금씩 다르게 줘서 손으로 던져 놓은 것처럼 보이게 합니다.
 * 무작위 대신 순서(index)로 정한 값이라 다시 그려도 사진이 제자리를 지킵니다.
 * 크기는 상자 폭 기준(cqw)이라 상자가 줄면 카드와 흩어진 거리도 같이 줄어듭니다.
 *
 * 주의할 점:
 *  - 들어오는 움직임(animate-photo-pile)은 transform을 덮어써서, 같은 위치를 --pile-* 변수로 넘겨 tokens.css의 keyframes와 맞춥니다.
 * @param {object} props
 * @param {import('@/types').PilePhoto[]} props.photos 그릴 사진 목록. 앞쪽이 맨 아래에 깔려요
 */
export default function PhotoPile({ photos }) {
  return (
    <section
      aria-label="고른 사진 더미"
      className="@container relative mx-auto h-80 w-full max-w-120 sm:h-95"
    >
      {photos.map((photo, index) => (
        <figure
          key={photo.id}
          className="absolute top-1/2 left-1/2 w-[46cqw] bg-white p-[2cqw] pb-[5cqw] shadow-lg motion-safe:animate-photo-pile"
          style={{
            '--pile-x': `${Math.sin(index * 2.399) * 17}cqw`,
            '--pile-y': `${Math.cos(index * 1.37) * 3}cqw`,
            '--pile-r': `${Math.sin(index * 4.117) * 8}deg`,
            transform:
              'translate(calc(-50% + var(--pile-x)), calc(-50% + var(--pile-y))) rotate(var(--pile-r))',
          }}
        >
          <img src={photo.src} alt={photo.filename} className="aspect-square w-full object-cover" />
          <figcaption className="mt-[3cqw] truncate font-mono text-2xs text-body">
            {photo.filename.replace(/\.[^.]+$/, '')}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
