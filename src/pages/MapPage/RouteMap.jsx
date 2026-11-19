import { useId, useMemo } from 'react';
import { geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

import { cn } from '@/utils/cn';
import { selectVisibleLegLabels } from '@/utils/legLabels';
import { getPlaceName } from '@/utils/mapScreen';
import { IDENTITY_ZOOM, unscaleAt } from '@/utils/mapZoom';
import {
  calcReachedStopIds,
  MAP_SIZE,
  mapProjection,
  splitByProgress,
  toLegLine,
} from '@/utils/routeMap';

import LegLabelLayer from './LegLabelLayer';
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
 * 책임: 받은 props만으로 땅·국경, 집, 다 그린 구간, 지금 구간의 진행, 도착한 지점, 지나온 기차·차 구간 라벨을 그립니다.
 *       재생 시간 계산(usePlayback)과 기간 필터(selectLegsByPeriod)는 쓰는 쪽이 합니다.
 * 호출: MapPage(01)
 * 크기: viewBox가 1440×799(MAP_SIZE)라 폭만 주면 높이가 비율대로 정해집니다.
 *       폭과 높이를 둘 다 주면 비율이 달라도 빈틈 없이 채우고 넘치는 쪽을 잘라냅니다(태평양이 가운데).
 *
 * 의도: 지점 점은 지금까지 도착한 곳만 찍습니다. 아직 그리지 않은 구간의 도착지가 먼저 보이지 않게 하려고요.
 *       home이 null이면(여행 0개) 경로 없이 지도만 그립니다.
 *       라벨은 도착한 구간에 남기되, 앞 라벨·집 표시·지점 점을 가리면 비켜 놓고 자리가 없으면 숨깁니다.
 *       자리는 재생 범위 전체로 한 번 정해서 재생 중에 옮겨 가지 않습니다(selectVisibleLegLabels).
 *       isLegModeEditing을 켜면(01 고치기 모드) 라벨을 눌러 이동 수단을 고칩니다(기능 명세 M107, LegLabelLayer).
 *       highlightedLegId 구간은 진하게 덧그려서 고치기 목록에서 고르는 구간이 지도 어디인지 보여 줍니다.
 *       확대(zoom, #184)는 땅 · 국경 · 경로를 한 그룹으로 키우고, 선 굵기는 non-scaling-stroke로 화면 굵기 그대로 둡니다.
 *       점 · 아이콘 · 라벨은 자기 자리를 중심으로 다시 줄여서(unscaleAt) 자리만 지도를 따라가고 크기는 그대로예요.
 *       휠 · 끌기 이벤트는 useMapZoom이 ref로 받은 이 <svg>에 직접 답니다.
 *
 * @param {object} props
 * @param {import('@/types').Journey['home']} props.home
 * @param {import('@/types').Stop[]} props.stops
 * @param {import('@/types').Leg[]} props.legs 집을 포함한 전체 구간, 시간 순서
 * @param {import('@/utils/routeMap').RouteProgress | null} props.progress null이면 모든 구간을 다 그린 상태
 * @param {(stopId: string) => void} [props.onSelectStop]
 * @param {boolean} [props.isLegModeEditing] 켜면 구간 라벨을 눌러 이동 수단을 골라요. 01 고치기 모드에서만 켜요
 * @param {(leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => void} [props.onChangeLegMode]
 *   라벨 메뉴에서 고르면 불러요. 저장은 쓰는 쪽이 해요
 * @param {string | null} [props.highlightedLegId] 진하게 덧그릴 구간. 다 그린 구간만 그려요
 * @param {import('@/utils/mapZoom').MapZoom} [props.zoom] 확대 상태. 없으면 세계 지도 전체예요
 * @param {boolean} [props.isDragging] 지도를 끄는 중이면 손 모양 커서를 쥔 모양으로 바꿔요
 * @param {import('react').Ref<SVGSVGElement>} [props.ref] useMapZoom의 ref
 * @param {string} [props.className]
 */
export default function RouteMap({
  home,
  stops,
  legs,
  progress,
  onSelectStop,
  isLegModeEditing = false,
  onChangeLegMode,
  highlightedLegId = null,
  zoom = IDENTITY_ZOOM,
  isDragging = false,
  ref,
  className,
}) {
  const glowFilterId = useId();
  // 재생 중에는 매 프레임 그려져서, 범위가 바뀔 때만 다시 계산해요.
  const legLabels = useMemo(() => selectVisibleLegLabels(legs, home, stops), [legs, home, stops]);
  const hasRoute = home !== null;
  const split = splitByProgress(hasRoute ? legs : [], progress);
  const reachedStopIds = calcReachedStopIds(split);
  const visibleStops = stops.filter((stop) => !stop.transit && reachedStopIds.has(stop.id));
  const [homeX, homeY] = hasRoute ? mapProjection([home.lng, home.lat]) : [0, 0];
  const arrivedLegs = split.current?.t === 1 ? [...split.done, split.current.leg] : split.done;
  const arrivedLegIds = new Set(arrivedLegs.map((leg) => leg.id));
  const arrivedLabels = legLabels.filter(({ leg }) => arrivedLegIds.has(leg.id));
  const highlightedLeg = split.done.find((leg) => leg.id === highlightedLegId);

  const handleStopKeyDown = (event, stopId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectStop?.(stopId);
    }
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      // img로 두면 안의 지점 버튼이 스크린 리더에서 사라져서 group으로 둬요
      role="group"
      aria-label="여행 경로 지도"
      className={cn(
        'block w-full touch-none bg-map',
        isDragging ? 'cursor-grabbing' : zoom.k > 1 && 'cursor-grab',
        className,
      )}
    >
      <defs>
        {/* 피그마 01 route active의 분홍 번짐. 확대한 그룹 안의 선에 걸려서, 번지는 폭을 배율만큼 줄여요 */}
        <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={4 / zoom.k}
            floodOpacity="0.35"
            className="[flood-color:var(--color-accent)]"
          />
        </filter>
      </defs>

      <g transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`}>
        <path d={LAND_PATH} className="fill-map-land" />
        <path
          d={BORDER_PATH}
          strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
          className="fill-none stroke-map-border"
        />

        {split.done.map((leg) => (
          <path
            key={leg.id}
            d={drawPath(toLegLine(leg))}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeDasharray={MODE_DASH[leg.mode]}
            vectorEffect="non-scaling-stroke"
            className="fill-none stroke-accent/80"
          />
        ))}

        {highlightedLeg && (
          <path
            data-leg-highlight={highlightedLeg.id}
            d={drawPath(toLegLine(highlightedLeg))}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={MODE_DASH[highlightedLeg.mode]}
            vectorEffect="non-scaling-stroke"
            className="fill-none stroke-ink"
          />
        )}

        {split.current && (
          <ProgressMarker
            leg={split.current.leg}
            t={split.current.t}
            destinationName={getPlaceName(home, stops, split.current.leg.to)}
            glowFilterId={glowFilterId}
            zoom={zoom}
          />
        )}

        {hasRoute && (
          <g aria-label={`집 ${home.city}`} transform={unscaleAt(zoom.k, homeX, homeY)}>
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
              transform={unscaleAt(zoom.k, x, y)}
              className="cursor-pointer"
            >
              {/* 점(지름 8)은 누르기 어려워서 보이지 않는 넓은 영역을 깔아요 */}
              <circle cx={x} cy={y} r={12} className="fill-transparent" />
              <circle
                cx={x}
                cy={y}
                r={3.25}
                strokeWidth={1.5}
                className="fill-accent stroke-white"
              />
            </g>
          );
        })}

        {/* 고치기를 끝내면 key가 바뀌어 열린 메뉴가 닫히고, 다시 시작하면 닫힌 채로 시작해요 */}
        <LegLabelLayer
          key={isLegModeEditing ? 'editing' : 'viewing'}
          labels={arrivedLabels}
          isEditing={isLegModeEditing}
          onChangeMode={onChangeLegMode}
          zoom={zoom}
        />
      </g>
    </svg>
  );
}
