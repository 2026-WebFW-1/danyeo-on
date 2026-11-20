import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MAP_ZOOM_STEP } from '@/constants/mapZoom';
import { useMapZoom } from '@/hooks/useMapZoom';
import { IDENTITY_ZOOM } from '@/utils/mapZoom';
import { MAP_SIZE } from '@/utils/routeMap';

let container;
let root;
let latest;
const onSelect = vi.fn();

// 지도와 같은 viewBox의 <svg>에 훅을 달아요. 1440 × 799 크기로 그려서 화면 1px이 viewBox 1이에요.
// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe() {
  const { ref, zoom, isDragging, zoomIn, zoomOut, reset } = useMapZoom();
  useEffect(() => {
    latest = { zoom, isDragging, zoomIn, zoomOut, reset };
  });
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
      style={{ display: 'block', width: MAP_SIZE.width, height: MAP_SIZE.height }}
    >
      <rect data-testid="stop" x={100} y={100} width={50} height={50} onClick={onSelect} />
      <foreignObject x={300} y={100} width={100} height={40}>
        <button type="button">라벨</button>
      </foreignObject>
    </svg>
  );
}

function getSvg() {
  return container.querySelector('svg');
}

function getPoint(x, y) {
  const rect = getSvg().getBoundingClientRect();
  return { clientX: rect.left + x, clientY: rect.top + y };
}

async function dispatch(target, event) {
  await act(async () => {
    target.dispatchEvent(event);
  });
}

function pointer(type, x, y) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    button: 0,
    ...getPoint(x, y),
  });
}

async function drag(target, from, to) {
  await dispatch(target, pointer('pointerdown', ...from));
  await dispatch(getSvg(), pointer('pointermove', ...to));
  await dispatch(getSvg(), pointer('pointerup', ...to));
  await dispatch(target, new MouseEvent('click', { bubbles: true, ...getPoint(...to) }));
}

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  onSelect.mockClear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(() => root.render(<Probe />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useMapZoom', () => {
  test('처음에는 확대하지 않은 상태예요', () => {
    expect(latest.zoom).toEqual(IDENTITY_ZOOM);
  });

  test('휠을 위로 굴리면 포인터 자리를 그대로 둔 채 확대해요', async () => {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -300,
      ...getPoint(400, 200),
    });
    await dispatch(getSvg(), event);

    const { k, x, y } = latest.zoom;
    expect(k).toBeGreaterThan(1);
    expect(k * 400 + x).toBeCloseTo(400);
    expect(k * 200 + y).toBeCloseTo(200);
    // 페이지가 같이 스크롤되지 않게 막아요
    expect(event.defaultPrevented).toBe(true);
  });

  test('줄 · 페이지 단위로 오는 휠도 px로 바꿔서 확대해요', async () => {
    const wheel = (deltaMode, deltaY) =>
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaMode,
        deltaY,
        ...getPoint(400, 200),
      });

    // 픽셀 300 ≈ 줄 18.75(16px) — 같은 만큼 굴린 셈이에요
    await dispatch(getSvg(), wheel(WheelEvent.DOM_DELTA_PIXEL, -300));
    const byPixel = latest.zoom.k;
    await act(() => latest.reset());
    await dispatch(getSvg(), wheel(WheelEvent.DOM_DELTA_LINE, -300 / 16));
    expect(latest.zoom.k).toBeCloseTo(byPixel);

    // 한 페이지(-1)는 지도 높이만큼이라 크게 확대돼요
    await act(() => latest.reset());
    await dispatch(getSvg(), wheel(WheelEvent.DOM_DELTA_PAGE, -0.25));
    expect(latest.zoom.k).toBeGreaterThan(1.3);
  });

  test('버튼으로 확대 · 축소하고 처음으로 돌아가요', async () => {
    await act(() => latest.zoomIn());
    expect(latest.zoom.k).toBeCloseTo(MAP_ZOOM_STEP);
    await act(() => latest.zoomIn());
    await act(() => latest.zoomOut());
    expect(latest.zoom.k).toBeCloseTo(MAP_ZOOM_STEP);
    await act(() => latest.reset());
    expect(latest.zoom).toEqual(IDENTITY_ZOOM);
  });

  test('확대한 지도를 끌면 끈 만큼 옮기고, 끈 뒤의 click은 지점 누르기로 치지 않아요', async () => {
    await act(() => latest.zoomIn());
    const before = latest.zoom;
    const stop = container.querySelector('[data-testid="stop"]');

    await drag(stop, [120, 120], [80, 90]);

    expect(latest.zoom.x).toBeCloseTo(before.x - 40);
    expect(latest.zoom.y).toBeCloseTo(before.y - 30);
    expect(latest.isDragging).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('조금만 움직였으면 끌기가 아니라 지점 누르기예요', async () => {
    await act(() => latest.zoomIn());
    const before = latest.zoom;
    const stop = container.querySelector('[data-testid="stop"]');

    await drag(stop, [120, 120], [122, 121]);

    expect(latest.zoom).toEqual(before);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('버튼 위에서 누르면 끌기를 시작하지 않아요', async () => {
    await act(() => latest.zoomIn());
    const before = latest.zoom;
    const button = container.querySelector('button');

    await dispatch(button, pointer('pointerdown', 320, 110));
    await dispatch(getSvg(), pointer('pointermove', 200, 50));
    await dispatch(getSvg(), pointer('pointerup', 200, 50));

    expect(latest.zoom).toEqual(before);
  });
});
