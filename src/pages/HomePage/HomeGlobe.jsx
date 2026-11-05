import { useEffect, useRef, useState } from 'react';

import {
  calcDraggedRotation,
  calcGlobePaths,
  calcInitialRotation,
  calcRouteDuration,
  calcRouteProgress,
  GLOBE_RADIUS,
  GLOBE_SIZE,
  ROUTE_CARD_COUNT,
} from '@/utils/globe';

import RouteCard from './RouteCard';

// 초당 도는 각도예요. 한 바퀴에 3분이에요. 빠르면 그린 경로가 금방 뒤로 넘어가요.
const SPIN_DEGREES_PER_SECOND = 2;
// 탭을 다녀오면 프레임 사이가 길게 벌어져요. 지구본이 갑자기 튀지 않게 이만큼만 흐른 것으로 쳐요.
const MAX_FRAME_MS = 100;
const GRADIENT_ID = 'home-globe-fill';

// 아래에 있는 것부터 그려요. 매 프레임 d만 바꾸는 path들이에요.
const GLOBE_LAYERS = [
  { key: 'graticule', className: 'fill-none stroke-white/15' },
  { key: 'land', className: 'fill-none stroke-globe-land/80 stroke-[2.5]' },
  { key: 'thinRoutes', className: 'fill-none stroke-route/60 stroke-[1.5]' },
  { key: 'thickRoutes', className: 'fill-none stroke-route stroke-[2.5]' },
  { key: 'routePoints', className: 'fill-accent stroke-white stroke-2' },
  { key: 'homeRing', className: 'fill-none stroke-white/90 stroke-[1.5]' },
  { key: 'homePoint', className: 'fill-white stroke-globe-deep stroke-2' },
];

/**
 * 00 오른쪽의 지구본과 도착 카드
 *
 * 책임: 지구본을 돌리고 집에서 나가는 경로를 하나씩 그려요. 경로가 도착하면 카드를 띄워요.
 *
 * 의도:
 *  - 회전값은 state가 아니라 ref에 둬요. 매 프레임 path의 d만 직접 바꿔서 React를 다시 그리지 않아요.
 *    다시 그리는 건 카드가 바뀌는 arrivedCount뿐이에요.
 *  - 마우스를 올리면 자전만 멈춰요. 경로는 계속 그려요(피그마 00 모션 주석).
 *  - 움직임을 줄이는 설정이면 돌리지 않고, 경로를 다 그린 상태로 보여 줘요. 끌기는 그대로 돼요.
 *
 * 주의할 것들:
 *  - 뒤로 넘어간 부분은 잘려요. 앞면에 없는 경로는 지구본이 돌아야 보여요.
 *  - 카드는 지구본 좌표가 아니라 피그마 자리에 고정해요. 지구본을 따라다니면 글자를 읽기 어려워요.
 *
 * @param {object} props
 * @param {import('@/types').Journey['home']} props.home 여행이 없으면 null
 * @param {import('@/utils/globe').GlobeRoute[]} props.routes 바뀌면 처음부터 다시 그려요
 */
export default function HomeGlobe({ home, routes }) {
  const layersRef = useRef({});
  const rotationRef = useRef(null);
  const isHoveredRef = useRef(false);
  const dragRef = useRef(null);
  const needsDrawRef = useRef(true);
  const [arrivedCount, setArrivedCount] = useState(0);

  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let elapsedMs = isReducedMotion ? calcRouteDuration(routes.length) : 0;
    let previousTime = null;
    let frameId = null;
    let isDrawing = true;

    rotationRef.current = calcInitialRotation(home, routes);
    needsDrawRef.current = true;

    const handleFrame = (time) => {
      const frameMs = previousTime === null ? 0 : Math.min(time - previousTime, MAX_FRAME_MS);
      previousTime = time;
      elapsedMs += frameMs;

      const isSpinning = !isReducedMotion && !isHoveredRef.current && !dragRef.current;
      if (isSpinning) {
        const [lambda, phi] = rotationRef.current;
        rotationRef.current = [lambda + (SPIN_DEGREES_PER_SECOND * frameMs) / 1000, phi];
      }

      const progress = calcRouteProgress(elapsedMs, routes.length);
      if (isSpinning || isDrawing || needsDrawRef.current) {
        const paths = calcGlobePaths(rotationRef.current, home, routes, progress);
        for (const { key } of GLOBE_LAYERS) layersRef.current[key]?.setAttribute('d', paths[key]);
        needsDrawRef.current = false;
      }
      // 마지막 경로까지 그린 뒤에도 한 번 더 그려야 곡선이 끝까지 닿아요.
      isDrawing = progress.current !== null;
      setArrivedCount(progress.arrivedCount);

      frameId = requestAnimationFrame(handleFrame);
    };

    frameId = requestAnimationFrame(handleFrame);
    return () => cancelAnimationFrame(frameId);
  }, [home, routes]);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    rotationRef.current = calcDraggedRotation(
      rotationRef.current,
      event.clientX - dragRef.current.x,
      event.clientY - dragRef.current.y,
    );
    dragRef.current = { x: event.clientX, y: event.clientY };
    needsDrawRef.current = true;
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handlePointerEnter = () => {
    isHoveredRef.current = true;
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
  };

  // 새 카드가 가장 먼저 도착한 카드 자리를 차지해요. key가 바뀌어 등장 움직임이 다시 돌아요.
  const firstCardIndex = Math.max(0, arrivedCount - ROUTE_CARD_COUNT);
  const cards = routes.slice(firstCardIndex, arrivedCount);

  return (
    <>
      <svg
        viewBox={`0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`}
        role="img"
        aria-label={home ? `${home.city}에서 나간 여행 경로를 그린 지구본` : '지구본'}
        className="absolute top-[-46px] right-[-20px] size-225 max-w-none"
      >
        <defs>
          <radialGradient id={GRADIENT_ID} cx="0.375" cy="0.406" r="0.72">
            <stop offset="0" className="[stop-color:var(--color-globe-light)]" />
            <stop offset="1" className="[stop-color:var(--color-globe-deep)]" />
          </radialGradient>
        </defs>
        <circle
          cx={GLOBE_SIZE / 2}
          cy={GLOBE_SIZE / 2}
          r={GLOBE_RADIUS}
          fill={`url(#${GRADIENT_ID})`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          className="cursor-grab drop-shadow-[0_16px_48px_rgba(0,0,0,0.3)] active:cursor-grabbing"
        />
        {GLOBE_LAYERS.map(({ key, className }) => (
          <path
            key={key}
            ref={(node) => {
              layersRef.current[key] = node;
            }}
            strokeLinecap="round"
            className={`pointer-events-none ${className}`}
          />
        ))}
      </svg>
      {cards.map((route, offset) => (
        <RouteCard
          key={route.id}
          route={route}
          homeCity={home.city}
          slot={(firstCardIndex + offset) % ROUTE_CARD_COUNT}
        />
      ))}
    </>
  );
}
