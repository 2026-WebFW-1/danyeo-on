import { useMemo, useRef } from 'react';

import timelineHandleIcon from '@/assets/icons/timeline-handle.svg';
import { usePlaybackPosition } from '@/hooks/usePlayback';
import { usePlaybackStore } from '@/stores/playbackStore';
import { cn } from '@/utils/cn';
import {
  calcAxisRatio,
  calcYearTicks,
  formatDotDate,
  getPlaceName,
  selectChapterSpans,
} from '@/utils/mapScreen';
import { calcTimeAtElapsed } from '@/utils/playback';

import { PANEL_STYLE } from './panelStyle';

// 키보드로 움직일 때 한 번에 옮기는 비율이에요.
const KEY_STEP_RATIO = 0.01;
// 지금 구간 글자가 상자 밖으로 나가지 않게 글자 중심을 양 끝에서 이만큼 안쪽에 둬요.
const LABEL_EDGE_PX = 90;
// 연도 눈금과 지금 구간 글자가 같은 줄이라, 글자 중심에서 이만큼 안쪽의 눈금은 숨겨요. 일부만 가려져 잘려 보이지 않게요.
// 글자 폭(약 170px)이 가장 넓게 차지하는 좁은 창(1024px)에 맞춘 값이에요.
const LABEL_TICK_GAP_RATIO = 0.16;

/**
 * 01 아래의 타임라인
 *
 * 책임: 연도 눈금, 지금까지 온 만큼의 선과 손잡이, 챕터 구간, 지금 구간 글자를 그리고 끌면 그 날짜로 옮깁니다.
 * 호출: MapPage
 *
 * 의도: 손잡이는 재생 위치(position)가 아니라 재생 시간(elapsedMs)으로 움직입니다.
 * 머무는 동안에는 position이 t: 1로 멈춰 있어서, 위치로 그리면 손잡이가 구간마다 건너뜁니다(buildDateTrack).
 * 끄는 동안에는 재생을 멈춥니다. 멈추지 않으면 손을 가만히 두어도 손잡이가 혼자 흘러갑니다.
 *
 * @param {object} props
 * @param {import('@/types').Journey['home']} props.home
 * @param {import('@/types').Stop[]} props.stops
 */
export default function TimelineScrubber({ home, stops }) {
  const legs = usePlaybackStore((state) => state.legs);
  const dateTrack = usePlaybackStore((state) => state.dateTrack);
  const elapsedMs = usePlaybackStore((state) => state.elapsedMs);
  const position = usePlaybackPosition();
  const railRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const chapterSpans = useMemo(() => selectChapterSpans(legs, stops), [legs, stops]);

  if (dateTrack.length === 0) return null;

  const axisFrom = dateTrack[0].fromTime;
  const axisTo = dateTrack.at(-1).toTime;
  const toRatio = (time) => calcAxisRatio(time, axisFrom, axisTo);
  const ratio = toRatio(calcTimeAtElapsed(dateTrack, elapsedMs));
  const handlePercent = `${ratio * 100}%`;

  // 다 그린 상태(position: null)면 마지막 구간에 도착한 것으로 보여 줘요.
  const leg = position ? legs[position.legIndex] : legs.at(-1);
  const isArrived = !position || position.t === 1;
  const legLabel = `${getPlaceName(home, stops, leg.from)} → ${getPlaceName(home, stops, leg.to)} · ${formatDotDate(
    isArrived ? leg.arriveAt : leg.departAt,
  )}`;

  const seekToRatio = (nextRatio) => {
    const clamped = Math.min(1, Math.max(0, nextRatio));
    usePlaybackStore.getState().seekToDate(axisFrom + clamped * (axisTo - axisFrom));
  };

  const seekToPointer = (event) => {
    const { left, width } = railRef.current.getBoundingClientRect();
    seekToRatio((event.clientX - left) / width);
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const { isPlaying, pause } = usePlaybackStore.getState();
    wasPlayingRef.current = isPlaying;
    pause();
    seekToPointer(event);
  };

  const handlePointerMove = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) seekToPointer(event);
  };

  const handleLostPointerCapture = () => {
    if (wasPlayingRef.current) usePlaybackStore.getState().play();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') seekToRatio(ratio + KEY_STEP_RATIO);
    if (event.key === 'ArrowLeft') seekToRatio(ratio - KEY_STEP_RATIO);
  };

  return (
    <section
      aria-label="여행 타임라인"
      className={cn('absolute right-98 bottom-8 left-8 h-16', PANEL_STYLE)}
    >
      <div className="absolute inset-x-6 top-2.5">
        {calcYearTicks(legs[0].departAt, axisTo)
          .filter(({ ratio: tickRatio }) => Math.abs(tickRatio - ratio) >= LABEL_TICK_GAP_RATIO)
          .map(({ year, ratio: tickRatio }) => (
            <span
              key={year}
              className="absolute font-serif text-2xs font-bold tracking-[0.2em] text-dim"
              style={{ left: `${tickRatio * 100}%` }}
            >
              {year}
            </span>
          ))}
        <span
          className="absolute -translate-x-1/2 text-2xs font-medium whitespace-nowrap text-nav"
          style={{
            left: `clamp(${LABEL_EDGE_PX}px, ${handlePercent}, calc(100% - ${LABEL_EDGE_PX}px))`,
          }}
        >
          {legLabel}
        </span>
      </div>

      {/* 끄기 쉽게 선보다 넓은 영역을 잡아요 */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="재생 위치"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuetext={legLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onLostPointerCapture={handleLostPointerCapture}
        onKeyDown={handleKeyDown}
        className="absolute inset-x-6 top-6.5 h-6 cursor-ew-resize touch-none"
      >
        <div ref={railRef} className="absolute inset-x-0 top-1/2 h-0.75 -translate-y-1/2 bg-line">
          <div className="h-full rounded-xs bg-accent" style={{ width: handlePercent }} />
          {chapterSpans.map(({ id, city, fromTime, toTime }) => (
            <div
              key={id}
              title={`챕터 ${city}`}
              className="absolute top-1/2 h-1.75 -translate-y-1/2 rounded-[4px] bg-accent/45"
              style={{
                left: `${toRatio(fromTime) * 100}%`,
                width: `${(toRatio(toTime) - toRatio(fromTime)) * 100}%`,
              }}
            />
          ))}
          <img
            src={timelineHandleIcon}
            alt=""
            width={12}
            height={12}
            className="absolute top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: handlePercent }}
          />
        </div>
      </div>
    </section>
  );
}
