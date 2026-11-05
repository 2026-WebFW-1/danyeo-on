import { FOLDED_DOT_PX } from '@/constants/places';

/**
 * 접어 둔 지점 줄이에요. 4곳째부터 이 한 줄로 줄어 있다가, 누르면 나머지 도시 블록이 모두 펼쳐져요.
 *
 * 호출: TripLine에서 펼치기 전에만 마지막에 놓여요.
 * <FoldedStop first={blocks[3]} hiddenCount={2} lineWidth={1.2} onExpand={handleExpand} />
 *
 * 의도: 줄에는 접힌 첫 지점의 번호·이름·날짜를 미리 보여 줘요(피그마 "more stop"). 접힌 곳이 둘 이상이면 몇 곳인지 적어요.
 * 점은 머문 날과 상관없이 같은 크기의 빈 점이에요.
 *
 * @param {object} props
 * @param {import('@/utils/cityBlocks').CityBlock} props.first 접힌 첫 지점
 * @param {number} props.hiddenCount 접힌 지점 수(첫 지점 포함)
 * @param {number} props.lineWidth 앞 블록에서 이 점으로 들어오는 선의 굵기(px)
 * @param {() => void} props.onExpand
 */
export default function FoldedStop({ first, hiddenCount, lineWidth, onExpand }) {
  const actionText = hiddenCount > 1 ? `+ ${hiddenCount}곳 펼치기` : '+ 펼치기';

  return (
    <li className="relative flex h-12.25 items-center pl-[calc(50%+30px)]">
      <span
        aria-hidden="true"
        className="absolute top-0 left-1/2 h-1/2 -translate-x-1/2 bg-accent"
        style={{ width: lineWidth }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-canvas"
        style={{ width: FOLDED_DOT_PX, height: FOLDED_DOT_PX }}
      />
      <button
        type="button"
        onClick={onExpand}
        className="flex items-center gap-4 rounded-pill border border-line bg-white py-3 pr-6 pl-5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="font-serif text-sm font-bold text-muted">{first.no}</span>
        <span className="text-lg font-bold text-ink">{first.stop.city}</span>
        <span className="text-sm text-muted">
          {first.startDate} · {first.stop.days}일
        </span>
        <span className="text-sm font-medium text-accent">{actionText}</span>
      </button>
    </li>
  );
}
