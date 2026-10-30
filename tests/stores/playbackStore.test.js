import { beforeEach, describe, expect, test } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { usePlaybackStore } from '@/stores/playbackStore';
import { calcPosition } from '@/utils/playback';

const { getState } = usePlaybackStore;
const legs = seojin.legs;

function position() {
  const { timeline, elapsedMs } = getState();
  return calcPosition(timeline, elapsedMs);
}

beforeEach(() => {
  getState().load(legs);
});

describe('load', () => {
  test('구간을 실으면 처음부터 재생해요', () => {
    expect(getState().isPlaying).toBe(true);
    expect(position()).toEqual({ legIndex: 0, t: 0 });
  });

  test('재생하던 중에 다시 실으면 처음으로 돌아가요', () => {
    getState().tick(5000);
    getState().load(legs);

    expect(getState().elapsedMs).toBe(0);
  });

  test('구간이 0개(empty)면 재생하지 않고 다 그린 상태예요', () => {
    getState().load(empty.legs);

    expect(getState().isPlaying).toBe(false);
    expect(position()).toBeNull();
  });
});

describe('tick', () => {
  test('재생 중이면 시간이 흘러요', () => {
    getState().tick(300);
    getState().tick(200);

    expect(getState().elapsedMs).toBe(500);
  });

  test('멈춰 있으면 시간이 흐르지 않아요', () => {
    getState().pause();
    getState().tick(300);

    expect(getState().elapsedMs).toBe(0);
  });

  test('전체 시간을 넘으면 다 그린 상태로 멈춰요', () => {
    getState().tick(getState().timeline.totalMs + 1);

    expect(getState().isPlaying).toBe(false);
    expect(position()).toBeNull();
  });
});

describe('play', () => {
  test('멈춘 곳에서 이어서 재생해요', () => {
    getState().tick(400);
    getState().pause();
    getState().play();

    expect(getState().isPlaying).toBe(true);
    expect(getState().elapsedMs).toBe(400);
  });

  test('끝난 뒤에 누르면 처음부터예요', () => {
    getState().tick(getState().timeline.totalMs + 1);
    getState().play();

    expect(getState().isPlaying).toBe(true);
    expect(position()).toEqual({ legIndex: 0, t: 0 });
  });

  test('구간이 0개(empty)면 아무것도 안 해요', () => {
    getState().load(empty.legs);
    getState().play();

    expect(getState().isPlaying).toBe(false);
  });
});

describe('seek', () => {
  test('멈춰 있으면 위치만 옮기고 멈춘 채예요', () => {
    getState().pause();
    getState().seek({ legIndex: 5, t: 0.5 });

    expect(getState().isPlaying).toBe(false);
    expect(position().legIndex).toBe(5);
    expect(position().t).toBeCloseTo(0.5);
  });

  test('재생 중이면 옮긴 곳에서 이어서 재생해요', () => {
    getState().seek({ legIndex: 5, t: 0.5 });
    getState().tick(10);

    expect(getState().isPlaying).toBe(true);
    expect(position().legIndex).toBe(5);
    expect(position().t).toBeGreaterThan(0.5);
  });

  test('null이면 끝으로 가고, 다음 tick에 멈춰요', () => {
    getState().seek(null);
    expect(position()).toBeNull();

    getState().tick(16);
    expect(getState().isPlaying).toBe(false);
  });
});
