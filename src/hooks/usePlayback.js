import { useEffect, useLayoutEffect, useRef } from 'react';

import { usePlaybackStore } from '@/stores/playbackStore';
import { calcPosition, isSameRoute } from '@/utils/playback';

// 탭을 숨기면 requestAnimationFrame이 멈췄다가, 돌아왔을 때 그동안의 시간이 한 프레임에 몰려 와요.
// 그만큼 건너뛰지 않게 한 프레임에 흘릴 시간을 잘라요.
const MAX_FRAME_MS = 100;

/**
 * 재생 스토어에서 지금 위치를 꺼내는 훅이에요. 도착 사진 카드·타임라인처럼 위치만 보면 되는 곳에서 써요.
 * calcPosition은 부를 때마다 새 객체를 돌려줘서 셀렉터 안에서 부르지 않고, 두 값을 꺼내 계산해요.
 *
 * @returns {import('@/utils/routeMap').RouteProgress | null}
 *   끝까지 재생했거나 구간이 0개면 null(다 그린 상태)
 */
export function usePlaybackPosition() {
  const timeline = usePlaybackStore((state) => state.timeline);
  const elapsedMs = usePlaybackStore((state) => state.elapsedMs);
  return calcPosition(timeline, elapsedMs);
}

/**
 * 01 지도 재생에서 여행 경로를 시간 순서대로 저절로 재생하는 훅이에요.
 * 돌려주는 position을 <RouteMap>의 progress에 그대로 넘기면 비행기가 움직이고 동선이 하나씩 그려져요.
 * 상태는 usePlaybackStore에 있고, 이 훅은 구간을 싣고 requestAnimationFrame으로 시간을 흘려요.
 *
 * 01 페이지에서 한 번만 불러요. 두 군데서 부르면 시간이 두 번씩 흘러요.
 * PAUSE 버튼·타임라인 같은 다른 컴포넌트는 usePlaybackStore(또는 usePlaybackPosition)에서 꺼내 쓰세요.
 *
 * 구간마다 이동 시간은 거리에 비례하고, 지점에 도착하면 잠깐 머물러요(src/utils/playback.js).
 * 끝까지 재생하면 다 그린 상태(position: null)로 멈춰요.
 *
 * 페이지를 열 때와 legs가 바뀔 때(1Y·2Y·ALL) 처음부터 다시 재생해요. 바뀌었는지는 배열이 같은 것인지로 봐요.
 * 그래서 렌더할 때마다 새로 만드는 배열(예: legs.filter(...))을 그대로 넘기면 계속 처음으로 돌아가요.
 * 이럴 땐 useMemo로 감싸서 넘겨 주세요.
 *
 * 다만 새 배열이어도 같은 경로(구간 ID가 같은 순서)면 처음으로 돌아가지 않고 지금 자리에서 이어 가요(isSameRoute).
 * 이동 수단을 고치면 Journey를 다시 계산해서 같은 구간이 새 객체로 오기 때문이에요.
 * 기간 탭을 바꿔도 구간이 똑같으면(예: 여행이 모두 2년 안이라 2Y와 ALL이 같음) 볼 게 달라지지 않아서 그대로 둬요.
 *
 * canResume을 켜면 페이지를 열 때 처음부터가 아니라 떠날 때의 자리에서 이어 가요(기능 명세 R106, #206).
 * 01에서 02 · 03으로 갔다가 뒤로 가기로 돌아올 때 써요. 스토어는 페이지를 나가도 남아서, 들어올 때 남아 있던 값을
 * 찍어 두고 같은 경로가 처음 실릴 때 그 자리로 돌려요. 바로 싣지 못하는 건 Journey를 읽는 동안 구간이 0개로 먼저 와서예요.
 * 떠난 뒤에 다른 경로를 봤거나(스토어에 다른 구간이 남음) 처음 연 화면이면 지금처럼 처음부터 재생해요.
 *
 * @param {import('@/types').Leg[]} legs 집을 포함한 전체 구간, 시간 순서
 * @param {object} [options]
 * @param {boolean} [options.canResume] 켜면 떠날 때와 같은 경로를 처음 실을 때 그 자리에서 이어요
 * @returns {{
 *   position: import('@/utils/routeMap').RouteProgress | null,
 *   isPlaying: boolean,
 *   play: () => void,
 *   pause: () => void,
 *   seek: (position: import('@/utils/routeMap').RouteProgress | null) => void,
 * }}
 *   position: 지금 위치. 끝까지 재생했거나 구간이 0개면 null(다 그린 상태)
 *   play: 재생. 끝난 뒤에 부르면 처음부터
 *   seek: 위치 옮기기. 재생 중이면 거기서부터 이어서 재생해요. null이면 끝으로 가요
 */
export function usePlayback(legs, { canResume = false } = {}) {
  const position = usePlaybackPosition();
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const seek = usePlaybackStore((state) => state.seek);

  // 이 화면에서 마지막으로 실은 구간이에요. 스토어의 legs는 페이지를 나가도 남아서 처음 열었는지 알 수 없어요.
  const loadedLegsRef = useRef(null);
  // 이 화면에 들어올 때 스토어에 남아 있던, 떠날 때의 재생 상태예요. 한 번 쓰거나 다른 경로를 실으면 비워요.
  const leftRef = useRef(null);

  // 화면에 그리기 전에 구간을 실어요. useEffect면 한 번은 옛 위치(처음 열 땐 다 그린 상태)로 그려져요.
  useLayoutEffect(() => {
    const loadedLegs = loadedLegsRef.current;
    // StrictMode가 effect를 한 번 더 부를 때 방금 실은 구간을 처음으로 되돌리지 않아요.
    if (loadedLegs === legs) return;

    const store = usePlaybackStore.getState();
    if (!loadedLegs && canResume && store.legs.length > 0) {
      leftRef.current = {
        legs: store.legs,
        timeline: store.timeline,
        elapsedMs: store.elapsedMs,
        isPlaying: store.isPlaying,
      };
    }
    const left = leftRef.current;

    if (loadedLegs && isSameRoute(loadedLegs, legs)) store.refresh(legs);
    else if (left && isSameRoute(left.legs, legs)) store.restore(legs, left);
    else store.load(legs);

    if (legs.length > 0) leftRef.current = null;
    loadedLegsRef.current = legs;
  }, [legs, canResume]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    // 프레임 수가 아니라 지난 시간으로 흘려야 기기 화면 주사율(60Hz·120Hz)과 상관없이 같은 빠르기예요.
    const { tick } = usePlaybackStore.getState();
    let frameId;
    let lastTime;
    const step = (now) => {
      const deltaMs = lastTime === undefined ? 0 : Math.min(now - lastTime, MAX_FRAME_MS);
      lastTime = now;
      tick(deltaMs);
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  return { position, isPlaying, play, pause, seek };
}
