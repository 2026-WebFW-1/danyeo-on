import { geoPath } from 'd3-geo';

import planeIcon from '@/assets/icons/plane.svg';
import { calcLegAngle, calcLegPoint, mapProjection, toLegLine, toLngLat } from '@/utils/routeMap';

const drawPath = geoPath(mapProjection);

// 비행기는 피그마 01의 Plane 아이콘(코가 위쪽)을 선 방향으로 돌려요.
// 아이콘 SVG는 그림자 자리까지 35.75×37이고, 비행기 중심은 그 안의 (18.5, 15.5)예요.
const PLANE = { width: 35.75, height: 37, centerX: 18.5, centerY: 15.5 };
// 기차·차 아이콘은 피그마 01에 지도용이 없어서, 구간 라벨처럼 Noto Emoji 글자를 써요.
// 글자는 뒤집히면 읽기 어려워서 돌리지 않아요.
const MODE_EMOJI = { train: '🚆', car: '🚗' };

/**
 * 01 지도 재생에서 지금 이동 중인 구간 하나
 *
 * 책임: 지금 구간을 t까지 굵게 그리고, 그 끝에 이동 수단 아이콘을 놓고,
 *       남은 부분은 흐린 점선으로 도착지(점선 동그라미)까지 보여 줍니다.
 * 호출: RouteMap. <svg> 안에서만 쓸 수 있습니다.
 * 크기: RouteMap의 viewBox(1440 폭) 기준 숫자를 그대로 씁니다. 피그마 01의 값입니다.
 */
export default function ProgressMarker({ leg, t, glowFilterId }) {
  const [x, y] = mapProjection(calcLegPoint(leg, t));
  const [toX, toY] = mapProjection(toLngLat(leg.toLatLng));
  const isArrived = t === 1;

  return (
    <g>
      {t > 0 && (
        <path
          d={drawPath(toLegLine(leg, 0, t))}
          filter={`url(#${glowFilterId})`}
          strokeWidth={3.5}
          strokeLinecap="round"
          className="fill-none stroke-accent"
        />
      )}
      {!isArrived && (
        <>
          <path
            d={drawPath(toLegLine(leg, t, 1))}
            strokeWidth={1.8}
            strokeDasharray="5.5 8"
            className="fill-none stroke-accent/45"
          />
          <circle
            cx={toX}
            cy={toY}
            r={5}
            strokeWidth={1.5}
            strokeDasharray="2 1.9"
            className="fill-white stroke-accent"
          />
        </>
      )}
      <g transform={`translate(${x} ${y})`}>
        {leg.mode === 'flight' ? (
          <image
            href={planeIcon}
            width={PLANE.width}
            height={PLANE.height}
            x={-PLANE.centerX}
            y={-PLANE.centerY}
            // 아이콘 코가 위(-90°)를 보고 있어서 90°를 더해요
            transform={`rotate(${calcLegAngle(leg, t) + 90})`}
          />
        ) : (
          <text textAnchor="middle" dominantBaseline="central" className="font-emoji text-lg">
            {MODE_EMOJI[leg.mode]}
          </text>
        )}
      </g>
    </g>
  );
}
