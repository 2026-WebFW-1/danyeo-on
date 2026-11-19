import { MODE_EMOJI } from '@/constants/journey';
import { cn } from '@/utils/cn';
import { formatInbound } from '@/utils/formatInbound';

// foreignObject는 크기를 정해야 해서 긴 글자('기차 · 12,345km')도 들어가는 폭으로 잡고 가운데 맞춰요.
const BOX_WIDTH = 130;
const LABEL_CLASS =
  'flex items-center gap-1 border border-line bg-white px-2 text-2xs whitespace-nowrap text-ink';

/**
 * 01 지도에서 지나온 기차·차 구간의 라벨. 예: 🚆 기차 · 552km
 * 비행으로 고친 구간도 라벨이 있어요(selectVisibleLegLabels).
 *
 * 호출: RouteMap. <svg> 안에서만 쓸 수 있습니다.
 *
 * 의도: 지도와 같은 viewBox 좌표로 놓으려고 HTML을 지도 위에 얹지 않고 foreignObject로 넣습니다.
 * 지도가 화면 비율에 따라 잘려도(slice) 라벨이 구간에서 어긋나지 않습니다.
 * 상자는 라벨보다 넓어서 상자는 포인터를 받지 않고, 누를 수 있는 라벨만 받습니다. 라벨 옆의 지점도 누를 수 있어요.
 * onOpen이 있으면 라벨이 이동 수단 메뉴(LegModeMenu)를 여는 버튼이 됩니다.
 *
 * @param {object} props
 * @param {import('@/types').Leg} props.leg
 * @param {import('@/utils/legLabels').MapRect} props.rect 라벨 자리(selectVisibleLegLabels)
 * @param {boolean} [props.isOpen] 이 라벨의 이동 수단 메뉴가 열려 있으면 true
 * @param {() => void} [props.onOpen] 없으면 누를 수 없는 라벨이에요
 */
export default function LegLabel({ leg, rect, isOpen = false, onOpen }) {
  const { left, right, top, bottom } = rect;
  const text = formatInbound(leg);
  const content = (
    <>
      <span aria-hidden="true" className="font-emoji">
        {MODE_EMOJI[leg.mode]}
      </span>
      <span className="font-medium">{text}</span>
    </>
  );

  return (
    <foreignObject
      x={(left + right - BOX_WIDTH) / 2}
      y={top}
      width={BOX_WIDTH}
      height={bottom - top}
      className="pointer-events-none"
    >
      <div className="flex h-full justify-center">
        {onOpen ? (
          <button
            type="button"
            // 메뉴 밖을 누르면 닫히는데, 라벨을 누를 땐 라벨이 열고 닫아요(LegModeMenu)
            data-leg-mode-trigger=""
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={`이동 수단 바꾸기: ${text}`}
            title="눌러서 이동 수단 바꾸기"
            onClick={onOpen}
            className={cn(
              LABEL_CLASS,
              'pointer-events-auto cursor-pointer hover:border-ink',
              isOpen && 'border-ink',
            )}
          >
            {content}
          </button>
        ) : (
          <p className={LABEL_CLASS}>{content}</p>
        )}
      </div>
    </foreignObject>
  );
}
