import { create } from 'zustand';

import { buildTimeline, calcElapsedMs } from '@/utils/playback';

/**
 * 01 지도 재생의 상태예요. 지도·PAUSE 버튼·타임라인·도착 사진 카드가 같이 봐요.
 * 시간을 흘리는 건(requestAnimationFrame) usePlayback이 하고, 이 스토어는 상태만 바꿔요.
 * 지금 위치(position)는 timeline과 elapsedMs로 계산해요(calcPosition). 상태에 따로 두지 않아요.
 *
 * @typedef {object} PlaybackState
 * @property {import('@/types').Leg[]} legs 지금 재생하는 구간들
 * @property {import('@/utils/playback').PlaybackTimeline} timeline
 * @property {number} elapsedMs 재생을 시작하고 지난 시간. 전체 시간을 넘으면 다 그린 상태예요
 * @property {boolean} isPlaying
 * @property {(legs: import('@/types').Leg[]) => void} load
 *   구간을 싣고 처음부터 재생해요. 움직임 줄이기 설정이면 재생 없이 다 그린 상태로 시작해요
 * @property {() => void} play 재생. 끝난 뒤에 부르면 처음부터
 * @property {() => void} pause
 * @property {(position: import('@/utils/routeMap').RouteProgress | null) => void} seek
 *   위치 옮기기. 재생 중이면 거기서부터 이어서 재생해요. null이면 끝으로 가요
 * @property {(deltaMs: number) => void} tick 재생 중일 때 시간을 흘려요. usePlayback만 불러요
 */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<PlaybackState>>} */
export const usePlaybackStore = create((set, get) => ({
  legs: [],
  timeline: buildTimeline([]),
  elapsedMs: Infinity,
  isPlaying: false,

  load: (legs) => {
    const timeline = buildTimeline(legs);
    const reduceMotion = prefersReducedMotion();
    set({
      legs,
      timeline,
      elapsedMs: reduceMotion ? Infinity : 0,
      isPlaying: !reduceMotion && timeline.steps.length > 0,
    });
  },

  play: () => {
    const { timeline, elapsedMs } = get();
    if (timeline.steps.length === 0) return;
    // 끝까지 재생한 뒤 다시 누르면 처음부터예요.
    const hasEnded = elapsedMs > timeline.totalMs;
    set({ isPlaying: true, elapsedMs: hasEnded ? 0 : elapsedMs });
  },

  pause: () => set({ isPlaying: false }),

  seek: (position) => set({ elapsedMs: calcElapsedMs(get().timeline, position) }),

  tick: (deltaMs) => {
    const { isPlaying, timeline } = get();
    if (!isPlaying) return;
    const elapsedMs = get().elapsedMs + deltaMs;
    // 전체 시간을 넘으면 다 그린 상태로 멈춰요(반복하지 않아요).
    set({ elapsedMs, isPlaying: elapsedMs <= timeline.totalMs });
  },
}));
