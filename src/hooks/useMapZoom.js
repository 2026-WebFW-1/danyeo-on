import { useCallback, useEffect, useState } from 'react';

import {
  DRAG_THRESHOLD_PX,
  MAP_ZOOM_STEP,
  PINCH_ZOOM_SPEED,
  WHEEL_ZOOM_SPEED,
} from '@/constants/mapZoom';
import { IDENTITY_ZOOM, panBy, zoomAt } from '@/utils/mapZoom';

// 휠의 deltaMode가 줄(1)이면 px로 바꿔요. 브라우저마다 한 줄이 16px 안팎이에요.
const LINE_HEIGHT_PX = 16;

/**
 * 01 지도를 휠로 확대하고 끌어서 옮기는 훅이에요(#184).
 *
 * 호출: MapPage가 부르고, ref는 RouteMap의 <svg>에, zoom은 RouteMap에, 버튼 함수는 MapZoomControls에 넘겨요.
 * const { ref, zoom, isDragging, zoomIn, zoomOut, reset } = useMapZoom();
 *
 * 의도:
 *  - 휠은 포인터 아래의 지도 자리를 그대로 둔 채 확대해요. 화면 좌표를 viewBox 좌표로 바꿀 때 getScreenCTM을 써서
 *    preserveAspectRatio="slice"로 잘린 만큼도 맞게 계산돼요.
 *  - React의 onWheel은 passive라 페이지 스크롤을 막을 수 없어서 addEventListener로 직접 달아요.
 *  - 지점 점을 눌러 그 지점으로 가는 기능이 있어서, DRAG_THRESHOLD_PX 넘게 움직였을 때만 끌기로 봐요.
 *    끌기가 시작되면 포인터를 잡아서(setPointerCapture) 지도 밖으로 나가도 계속 옮겨지고,
 *    끝난 뒤 따라오는 click은 잡아 버려서 지점 누르기로 치지 않아요.
 *  - 버튼(구간 라벨 · 이동 수단 메뉴) 위에서 누르면 끌기를 시작하지 않아요. 고치기 모드에서 라벨을 눌러야 해서요.
 *  - ref는 콜백 ref예요. <svg>가 새로 생기면 리스너를 다시 달아요.
 *
 * @returns {{
 *   ref: (node: SVGSVGElement | null) => void,
 *   zoom: import('@/utils/mapZoom').MapZoom,
 *   isDragging: boolean,
 *   zoomIn: () => void,
 *   zoomOut: () => void,
 *   reset: () => void,
 * }}
 */
export function useMapZoom() {
  const [svg, setSvg] = useState(null);
  const [zoom, setZoom] = useState(IDENTITY_ZOOM);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!svg) return undefined;

    /** @type {{ pointerId: number, startX: number, startY: number, lastX: number, lastY: number, isDragging: boolean } | null} */
    let drag = null;
    let shouldSkipClick = false;

    const toViewBox = (clientX, clientY) => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return undefined;
      const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
      return [point.x, point.y];
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const deltaY = event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT_PX : event.deltaY;
      const speed = event.ctrlKey ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED;
      const factor = Math.exp(-deltaY * speed);
      const center = toViewBox(event.clientX, event.clientY);
      setZoom((current) => zoomAt(current, factor, center));
    };

    const handlePointerDown = (event) => {
      shouldSkipClick = false;
      if (event.button !== 0 || event.target.closest?.('button, [role="menu"]')) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        isDragging: false,
      };
    };

    const handlePointerMove = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!drag.isDragging) {
        const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (moved <= DRAG_THRESHOLD_PX) return;
        drag.isDragging = true;
        svg.setPointerCapture?.(event.pointerId);
        setIsDragging(true);
      }
      // 화면 1px이 viewBox로 몇인지예요. 가로세로 비율이 같아서 a 하나로 충분해요.
      const pxPerUnit = svg.getScreenCTM()?.a || 1;
      const dx = (event.clientX - drag.lastX) / pxPerUnit;
      const dy = (event.clientY - drag.lastY) / pxPerUnit;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      setZoom((current) => panBy(current, dx, dy));
    };

    const handlePointerEnd = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (drag.isDragging) {
        shouldSkipClick = true;
        setIsDragging(false);
      }
      drag = null;
    };

    // 캡처 단계라서 지점(<g role="button">)의 onClick보다 먼저 받아요.
    const handleClick = (event) => {
      if (!shouldSkipClick) return;
      shouldSkipClick = false;
      event.stopPropagation();
      event.preventDefault();
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.addEventListener('pointerdown', handlePointerDown);
    svg.addEventListener('pointermove', handlePointerMove);
    svg.addEventListener('pointerup', handlePointerEnd);
    svg.addEventListener('pointercancel', handlePointerEnd);
    svg.addEventListener('click', handleClick, true);
    return () => {
      svg.removeEventListener('wheel', handleWheel);
      svg.removeEventListener('pointerdown', handlePointerDown);
      svg.removeEventListener('pointermove', handlePointerMove);
      svg.removeEventListener('pointerup', handlePointerEnd);
      svg.removeEventListener('pointercancel', handlePointerEnd);
      svg.removeEventListener('click', handleClick, true);
    };
  }, [svg]);

  const zoomIn = useCallback(() => setZoom((current) => zoomAt(current, MAP_ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((current) => zoomAt(current, 1 / MAP_ZOOM_STEP)), []);
  const reset = useCallback(() => setZoom(IDENTITY_ZOOM), []);

  return { ref: setSvg, zoom, isDragging, zoomIn, zoomOut, reset };
}
