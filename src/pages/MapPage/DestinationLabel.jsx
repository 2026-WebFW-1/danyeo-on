import { cn } from '@/utils/cn';
import { MAP_SIZE } from '@/utils/routeMap';

const BOX = { width: 180, height: 24 };
// 피그마 01: 도착지 점 중심에서 라벨 왼쪽 끝까지 14
const GAP = 14;

/**
 * 01 지도에서 지금 가는 지점 옆의 라벨. 예: 시드니 도착 예정
 *
 * 호출: ProgressMarker. <svg> 안에서만 쓸 수 있습니다.
 *
 * 의도: 데이터에는 한글 도시 이름만 있어서 피그마의 영문(SYDNEY) 대신 한글로 보여 줍니다.
 * 지도 오른쪽 끝에 가까운 지점은 라벨이 잘리지 않게 왼쪽에 놓습니다.
 *
 * @param {object} props
 * @param {number} props.x 도착지의 지도 x 좌표
 * @param {number} props.y 도착지의 지도 y 좌표
 * @param {string} props.name 도착지 도시 이름
 */
export default function DestinationLabel({ x, y, name }) {
  const isFlipped = x + GAP + BOX.width > MAP_SIZE.width;

  return (
    <foreignObject
      x={isFlipped ? x - GAP - BOX.width : x + GAP}
      y={y - BOX.height / 2}
      width={BOX.width}
      height={BOX.height}
      className="pointer-events-none"
    >
      <div className={cn('flex h-full', isFlipped && 'justify-end')}>
        <p className="flex items-center gap-1 bg-ink px-3 text-2xs whitespace-nowrap text-white">
          <span className="font-bold">{name}</span>
          도착 예정
        </p>
      </div>
    </foreignObject>
  );
}
