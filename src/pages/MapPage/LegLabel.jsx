import { MODE_EMOJI } from '@/constants/journey';
import { formatInbound } from '@/utils/formatInbound';

// foreignObject는 크기를 정해야 해서 긴 글자('기차 · 12,345km')도 들어가는 폭으로 잡고 가운데 맞춰요.
const BOX_WIDTH = 130;

/**
 * 01 지도에서 지나온 기차·차 구간의 라벨. 예: 🚆 기차 · 552km
 *
 * 호출: RouteMap. <svg> 안에서만 쓸 수 있습니다.
 *
 * 의도: 지도와 같은 viewBox 좌표로 놓으려고 HTML을 지도 위에 얹지 않고 foreignObject로 넣습니다.
 * 지도가 화면 비율에 따라 잘려도(slice) 라벨이 구간에서 어긋나지 않습니다.
 * 라벨 밑의 지점도 누를 수 있게 포인터를 받지 않습니다.
 *
 * @param {object} props
 * @param {import('@/types').Leg} props.leg 기차·차 구간
 * @param {import('@/utils/legLabels').MapRect} props.rect 라벨 자리(selectVisibleLegLabels)
 */
export default function LegLabel({ leg, rect }) {
  const { left, right, top, bottom } = rect;

  return (
    <foreignObject
      x={(left + right - BOX_WIDTH) / 2}
      y={top}
      width={BOX_WIDTH}
      height={bottom - top}
      className="pointer-events-none"
    >
      <div className="flex h-full justify-center">
        <p className="flex items-center gap-1 border border-line bg-white px-2 text-2xs whitespace-nowrap text-ink">
          <span aria-hidden="true" className="font-emoji">
            {MODE_EMOJI[leg.mode]}
          </span>
          <span className="font-medium">{formatInbound(leg)}</span>
        </p>
      </div>
    </foreignObject>
  );
}
