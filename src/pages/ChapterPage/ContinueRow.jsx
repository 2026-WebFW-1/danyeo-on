import { Link } from 'react-router';

/**
 * 챕터 맨 아래 오른쪽의 "NEXT · 다음 지점"과 [계속 여행하기 →] 버튼이에요(기능 명세 R106).
 * 여행의 마지막 지점이라 다음이 없으면 NEXT 글자 없이 [전체 기록 보기 →]만 나와요.
 *
 * 호출: Collage 캔버스 안에서 top에 맞춰 그려요. 캔버스 좌표를 쓰니 캔버스와 함께 줄어요.
 * 의도: 다음 지점 이름이 길면 줄이 왼쪽으로 길게 자라 글 카드를 덮어서, NEXT 글자는 192px에서 줄임표로 잘라요.
 * <ContinueRow target={target} top={layout.continueTop} />
 *
 * @param {object} props
 * @param {{ path: string, label: string, nextName: string | null }} props.target getContinueTarget의 결과
 * @param {number} props.top 줄 윗변의 캔버스 좌표(px)
 */
export default function ContinueRow({ target, top }) {
  return (
    <div className="absolute right-15 flex items-center gap-4.5" style={{ top }}>
      {target.nextName && (
        <p className="max-w-48 overflow-hidden font-serif text-xs font-bold tracking-[0.2em] text-ellipsis whitespace-pre text-muted uppercase">
          {`NEXT  ·  ${target.nextName}`}
        </p>
      )}
      <Link
        to={target.path}
        className="flex items-center gap-3 rounded-pill bg-ink px-6 py-4 text-lg font-bold whitespace-nowrap text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {target.label}
        <span aria-hidden="true" className="font-serif">
          →
        </span>
      </Link>
    </div>
  );
}
