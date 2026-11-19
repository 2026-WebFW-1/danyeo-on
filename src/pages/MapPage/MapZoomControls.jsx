import { MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '@/constants/mapZoom';
import { cn } from '@/utils/cn';

import { PANEL_STYLE } from './panelStyle';

const BUTTON_CLASS =
  'flex size-9 items-center justify-center text-lg text-nav hover:bg-paper disabled:text-dim disabled:hover:bg-white';

/**
 * 01 오른쪽의 지도 확대 · 축소 · 전체 보기 버튼이에요(#184).
 *
 * 호출: MapPage. 확대 상태와 함수는 useMapZoom이 줘요.
 * <MapZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} />
 *
 * 의도:
 *  - 휠 · 끌기는 마우스로만 돼서, 키보드로도 확대할 수 있게 버튼을 둬요.
 *  - 피그마 01에 확대 버튼이 없어서 지도 위 다른 상자(PANEL_STYLE)와 같은 모양으로, 재생 버튼 아래에 세로로 놓아요.
 *  - 더 키우거나 줄일 수 없으면 그 버튼을 막아요. 전체 보기는 확대했을 때만 눌러요.
 *
 * @param {object} props
 * @param {import('@/utils/mapZoom').MapZoom} props.zoom
 * @param {() => void} props.onZoomIn
 * @param {() => void} props.onZoomOut
 * @param {() => void} props.onReset
 */
export default function MapZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  const isZoomed = zoom.k > MAP_MIN_ZOOM;

  return (
    <div
      role="group"
      aria-label="지도 확대"
      className={cn('absolute top-28 right-6 flex flex-col divide-y divide-line', PANEL_STYLE)}
    >
      <button
        type="button"
        aria-label="지도 확대"
        disabled={zoom.k >= MAP_MAX_ZOOM}
        onClick={onZoomIn}
        className={BUTTON_CLASS}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        aria-label="지도 축소"
        disabled={!isZoomed}
        onClick={onZoomOut}
        className={BUTTON_CLASS}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        aria-label="세계 지도 전체 보기"
        disabled={!isZoomed}
        onClick={onReset}
        className={cn(BUTTON_CLASS, 'text-sm')}
      >
        <span aria-hidden="true">⤢</span>
      </button>
    </div>
  );
}
