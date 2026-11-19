import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import { usePlayback } from '@/hooks/usePlayback';
import { usePlaybackStore } from '@/stores/playbackStore';

// 재생 로직(load · tick · play · seek)은 tests/stores/playbackStore.test.js가 봐요.
// 여기서는 훅에만 있는 것, 구간 싣기와 requestAnimationFrame 루프만 봐요.

const { getState } = usePlaybackStore;
const legs = seojin.legs;

let container;
let root;
let latest;

// requestAnimationFrame을 손으로 돌리려고 가짜로 바꿔요. 걸린 콜백은 runFrame(now)으로 한 프레임씩 불러요.
let pendingFrames;
let nextFrameId;
const cancelAnimationFrame = vi.fn((id) => pendingFrames.delete(id));

function requestAnimationFrame(callback) {
  const id = nextFrameId++;
  pendingFrames.set(id, callback);
  return id;
}

function runFrame(now) {
  const callbacks = [...pendingFrames.values()];
  pendingFrames.clear();
  act(() => callbacks.forEach((callback) => callback(now)));
}

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ legs: probeLegs }) {
  const result = usePlayback(probeLegs);
  useEffect(() => {
    latest = result;
  });
  return null;
}

const mount = (probeLegs = legs) => act(() => root.render(<Probe legs={probeLegs} />));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  pendingFrames = new Map();
  nextFrameId = 1;
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
  container = document.createElement('div');
  root = createRoot(container);
  latest = undefined;
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
  cancelAnimationFrame.mockClear();
});

describe('usePlayback', () => {
  test('들어오면 구간을 싣고 처음부터 재생해요', () => {
    mount();

    expect(getState().legs).toBe(legs);
    expect(latest.isPlaying).toBe(true);
    expect(latest.position).toEqual({ legIndex: 0, t: 0 });
  });

  test('재생 중이면 프레임마다 지난 시간만큼 흘러요', () => {
    mount();

    // 첫 프레임은 기준 시각만 잡고 흘리지 않아요.
    runFrame(1000);
    expect(getState().elapsedMs).toBe(0);

    runFrame(1016);
    runFrame(1032);
    expect(getState().elapsedMs).toBe(32);
  });

  test('한 프레임에 시간이 몰려 와도(탭을 숨겼다 돌아옴) 100ms만 흘려요', () => {
    mount();

    runFrame(1000);
    runFrame(6000);

    expect(getState().elapsedMs).toBe(100);
  });

  test('멈추면 루프를 끄고, 다시 재생하면 이어서 흘러요', () => {
    mount();
    runFrame(1000);
    runFrame(1050);

    act(() => latest.pause());

    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);

    act(() => latest.play());
    // 다시 켜면 새 기준 시각을 잡아서, 멈춰 있던 시간은 흘리지 않아요.
    runFrame(9000);
    runFrame(9020);

    expect(getState().elapsedMs).toBe(70);
  });

  test('화면을 떠나면 루프를 꺼요', () => {
    mount();
    runFrame(1000);

    act(() => root.unmount());

    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);
  });

  test('legs가 바뀌면 처음부터, 같은 배열로 다시 그리면 이어서 재생해요', () => {
    mount();
    runFrame(1000);
    runFrame(1050);

    mount(legs);
    expect(getState().elapsedMs).toBe(50);

    const firstTrip = legs.filter((leg) => leg.tripId === legs[0].tripId);
    mount(firstTrip);
    expect(getState().legs).toBe(firstTrip);
    expect(getState().elapsedMs).toBe(0);
  });

  test('같은 경로가 새 배열로 오면(이동 수단을 고친 뒤) 처음으로 돌아가지 않아요', () => {
    mount();
    runFrame(1000);
    runFrame(1050);

    const refreshed = legs.map((leg) => ({ ...leg, mode: 'car' }));
    mount(refreshed);

    expect(getState().legs).toBe(refreshed);
    expect(getState().elapsedMs).toBe(50);
  });

  test('페이지를 다시 열면 스토어에 같은 경로가 남아 있어도 처음부터 재생해요', () => {
    mount();
    runFrame(1000);
    runFrame(1050);
    act(() => root.unmount());

    root = createRoot(container);
    mount(legs.map((leg) => ({ ...leg })));

    expect(getState().elapsedMs).toBe(0);
  });
});
