import { useId } from 'react';
import { geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

import { cn } from '@/utils/cn';
import {
  calcReachedStopIds,
  MAP_SIZE,
  mapProjection,
  splitByProgress,
  toLegLine,
} from '@/utils/routeMap';

import ProgressMarker from './ProgressMarker';

const drawPath = geoPath(mapProjection);

// 나라 경계는 바뀌지 않으니 처음 불러올 때 한 번만 path 문자열로 만들어 둬요.
const LAND_PATH = drawPath(feature(world, world.objects.countries));
const BORDER_PATH = drawPath(mesh(world, world.objects.countries, (a, b) => a !== b));

// 피그마 01 범례: 비행 실선, 기차 긴 점선, 버스·차 짧은 점선(둥근 끝이라 점처럼 보여요)
const MODE_DASH = { flight: undefined, train: '5.6 3.7', car: '1.5 4.1' };

/**
 * 01 지도 재생의 세계 지도와 여행 경로
 *
 * 책임: 받은 props만으로 땅·국경, 집, 다 그린 구간, 지금 구간의 진행, 도착한 지점을 그립니다.
 *       재생 시간 계산(usePlayback)과 기간 필터(selectLegsByPeriod)는 쓰는 쪽이 합니다.
 * 호출: MapPage(01). 라우트 연결은 D가 합니다.
 * 크기: viewBox가 1440×799(MAP_SIZE)라 폭만 주면 높이가 비율대로 정해집니다.
 *       폭과 높이를 둘 다 주면 비율이 달라도 빈틈 없이 채우고 넘치는 쪽을 잘라냅니다(태평양이 가운데).
 *
 * 의도: 지점 점은 지금까지 도착한 곳만 찍습니다. 아직 그리지 않은 구간의 도착지가 먼저 보이지 않게 하려고요.
 *       home이 null이면(여행 0개) 경로 없이 지도만 그립니다.
 *
 * @param {object} props
 * @param {import('@/types').Journey['home']} props.home
 * @param {import('@/types').Stop[]} props.stops
 * @param {import('@/types').Leg[]} props.legs 집을 포함한 전체 구간, 시간 순서
 * @param {import('@/utils/routeMap').RouteProgress | null} props.progress null이면 모든 구간을 다 그린 상태
 * @param {(stopId: string) => void} [props.onSelectStop]
 * @param {string} [props.className]
 */
export default function RouteMap({ home, stops, legs, progress, onSelectStop, className }) {
  const glowFilterId = useId();
  const hasRoute = home !== null;
  const split = splitByProgress(hasRoute ? legs : [], progress);
  const reachedStopIds = calcReachedStopIds(split);
  const visibleStops = stops.filter((stop) => !stop.transit && reachedStopIds.has(stop.id));
  const [homeX, homeY] = hasRoute ? mapProjection([home.lng, home.lat]) : [0, 0];

  const handleStopKeyDown = (event, stopId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectStop?.(stopId);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      // img로 두면 안의 지점 버튼이 스크린 리더에서 사라져서 group으로 둬요
      role="group"
      aria-label="여행 경로 지도"
      className={cn('block w-full bg-map', className)}
    >
      <defs>
        {/* 피그마 01 route active의 분홍 번짐 */}
        <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="4"
            floodOpacity="0.35"
            className="[flood-color:var(--color-accent)]"
          />
        </filter>
      </defs>

      <path d={LAND_PATH} className="fill-map-land" />
      <path d={BORDER_PATH} strokeWidth={0.6} className="fill-none stroke-map-border" />

      {split.done.map((leg) => (
        <path
          key={leg.id}
          d={drawPath(toLegLine(leg))}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray={MODE_DASH[leg.mode]}
          className="fill-none stroke-accent/80"
        />
      ))}

      {split.current && (
        <ProgressMarker leg={split.current.leg} t={split.current.t} glowFilterId={glowFilterId} />
      )}

      {hasRoute && (
        <g aria-label={`집 ${home.city}`}>
          <circle
            cx={homeX}
            cy={homeY}
            r={16.25}
            strokeWidth={1.5}
            className="fill-none stroke-ink/80"
          />
          <circle cx={homeX} cy={homeY} r={5} strokeWidth={2} className="fill-ink stroke-white" />
        </g>
      )}

      {visibleStops.map((stop) => {
        const [x, y] = mapProjection([stop.lng, stop.lat]);
        return (
          <g
            key={stop.id}
            role="button"
            tabIndex={0}
            aria-label={`${stop.city}, ${stop.country}`}
            onClick={() => onSelectStop?.(stop.id)}
            onKeyDown={(event) => handleStopKeyDown(event, stop.id)}
            className="cursor-pointer"
          >
            {/* 점(지름 8)은 손가락으로 누르기 어려워서 보이지 않는 넓은 영역을 깔아요 */}
            <circle cx={x} cy={y} r={12} className="fill-transparent" />
            <circle cx={x} cy={y} r={3.25} strokeWidth={1.5} className="fill-accent stroke-white" />
          </g>
        );
      })}
    </svg>
  );
}
