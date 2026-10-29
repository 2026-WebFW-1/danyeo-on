import { describe, expect, test } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  buildTimeline,
  calcElapsedMs,
  calcMoveMs,
  calcPosition,
  calcPositionAtDate,
} from '@/utils/playback';

const legs = seojin.legs;
const timeline = buildTimeline(legs);
const { steps } = timeline;

describe('calcMoveMs', () => {
  test('먼 구간일수록 오래 걸려요', () => {
    expect(calcMoveMs(6000)).toBeCloseTo(calcMoveMs(3000) * 2);
  });

  test('아주 짧은 구간도 최소 시간은 걸려요 (부산 → 경주 79km)', () => {
    expect(calcMoveMs(79)).toBe(calcMoveMs(0));
    expect(calcMoveMs(79)).toBeGreaterThan(0);
  });

  test('아주 먼 구간은 최대 시간에서 멈춰요', () => {
    expect(calcMoveMs(20000)).toBe(calcMoveMs(40000));
  });
});

describe('buildTimeline', () => {
  test('구간마다 일정이 하나씩, 앞 구간이 끝나는 시간에 다음 구간이 출발해요', () => {
    expect(steps).toHaveLength(legs.length);
    expect(steps[0].startMs).toBe(0);
    steps.slice(1).forEach((step, index) => {
      const prev = steps[index];
      expect(step.startMs).toBe(prev.startMs + prev.moveMs + prev.stayMs);
    });
  });

  test('지점에 도착하면 머물고, 집에 돌아오면 머물지 않아요', () => {
    legs.forEach((leg, index) => {
      if (leg.to === 'home') expect(steps[index].stayMs).toBe(0);
      else expect(steps[index].stayMs).toBeGreaterThan(0);
    });
  });

  test('전체 시간은 마지막 구간이 끝나는 시간이에요', () => {
    const last = steps.at(-1);
    expect(timeline.totalMs).toBe(last.startMs + last.moveMs + last.stayMs);
  });

  test('구간이 0개(empty)면 일정도 없고 전체 시간은 0이에요', () => {
    expect(buildTimeline(empty.legs)).toEqual({ steps: [], totalMs: 0 });
  });
});

describe('calcPosition', () => {
  test('0ms면 첫 구간 출발이에요', () => {
    expect(calcPosition(timeline, 0)).toEqual({ legIndex: 0, t: 0 });
  });

  test('구간 이동 중간이면 그만큼 온 비율이에요', () => {
    const { startMs, moveMs } = steps[3];
    const position = calcPosition(timeline, startMs + moveMs * 0.25);

    expect(position.legIndex).toBe(3);
    expect(position.t).toBeCloseTo(0.25);
  });

  test('도착하고 머무는 동안은 그 구간의 t: 1이에요', () => {
    const index = legs.findIndex((leg) => leg.to !== 'home');
    const { startMs, moveMs, stayMs } = steps[index];

    expect(calcPosition(timeline, startMs + moveMs + stayMs / 2)).toEqual({
      legIndex: index,
      t: 1,
    });
  });

  test('구간 경계에선 앞 구간 도착, 조금이라도 지나면 다음 구간 출발이에요', () => {
    const next = steps[4].startMs;

    expect(calcPosition(timeline, next)).toEqual({ legIndex: 3, t: 1 });
    const after = calcPosition(timeline, next + 1);
    expect(after.legIndex).toBe(4);
    expect(after.t).toBeCloseTo(0, 2);
  });

  test('집에 돌아오고 바로 다음 여행을 떠나요 (집에 있던 기간은 건너뛰어요)', () => {
    const returnIndex = legs.findIndex((leg) => leg.kind === 'return');
    const { startMs, moveMs } = steps[returnIndex];

    expect(steps[returnIndex + 1].startMs).toBe(startMs + moveMs);
  });

  test('딱 전체 시간이면 마지막 구간 도착이고, 넘으면 null(다 그린 상태)이에요', () => {
    expect(calcPosition(timeline, timeline.totalMs)).toEqual({ legIndex: legs.length - 1, t: 1 });
    expect(calcPosition(timeline, timeline.totalMs + 1)).toBeNull();
    expect(calcPosition(timeline, Infinity)).toBeNull();
  });

  test('구간이 0개(empty)면 null이에요', () => {
    expect(calcPosition(buildTimeline(empty.legs), 0)).toBeNull();
  });

  test('음수 시간은 처음으로 봐요', () => {
    expect(calcPosition(timeline, -50)).toEqual({ legIndex: 0, t: 0 });
  });

  test('구간이 많아도(heavy 168개) 마지막 구간까지 순서대로 가요', () => {
    const heavyTimeline = buildTimeline(heavy.legs);
    const last = heavyTimeline.steps.at(-1);

    expect(calcPosition(heavyTimeline, last.startMs + 1).legIndex).toBe(heavy.legs.length - 1);
  });
});

describe('calcElapsedMs', () => {
  test.each([
    { legIndex: 0, t: 0 },
    { legIndex: 0, t: 0.5 },
    { legIndex: 5, t: 0.3 },
    { legIndex: 7, t: 0.99 },
    { legIndex: 3, t: 1 },
    { legIndex: legs.length - 1, t: 0.6 },
  ])('position $legIndex·$t → 시간 → position이 같은 값으로 돌아와요', (position) => {
    const back = calcPosition(timeline, calcElapsedMs(timeline, position));

    expect(back.legIndex).toBe(position.legIndex);
    expect(back.t).toBeCloseTo(position.t);
  });

  test('t: 1은 도착한 순간(머물기 시작)이에요', () => {
    const { startMs, moveMs } = steps[2];

    expect(calcElapsedMs(timeline, { legIndex: 2, t: 1 })).toBe(startMs + moveMs);
  });

  test('null이나 구간 수를 넘는 legIndex는 다 그린 상태(Infinity)예요', () => {
    expect(calcElapsedMs(timeline, null)).toBe(Infinity);
    expect(calcElapsedMs(timeline, { legIndex: legs.length, t: 0 })).toBe(Infinity);
  });

  test('t가 0~1을 벗어나면 끝으로 맞춰요', () => {
    expect(calcElapsedMs(timeline, { legIndex: 1, t: 1.4 })).toBe(
      calcElapsedMs(timeline, { legIndex: 1, t: 1 }),
    );
    expect(calcElapsedMs(timeline, { legIndex: 1, t: -0.2 })).toBe(steps[1].startMs);
  });
});

describe('calcPositionAtDate', () => {
  const [first, second] = legs;

  test('첫 출발보다 앞이면 첫 구간 출발이에요', () => {
    expect(calcPositionAtDate(legs, '2020-01-01T00:00:00+09:00')).toEqual({ legIndex: 0, t: 0 });
  });

  test('이동 중이면 출발·도착 시각 사이의 비율이에요 (시간대가 달라도 같은 순간으로 계산해요)', () => {
    // 서울(+09:00) 17:01:21 출발 → 방콕(+07:00) 20:10:08 도착, 실제로 5시간 9분 정도예요
    const departMs = Date.parse(first.departAt);
    const arriveMs = Date.parse(first.arriveAt);
    const position = calcPositionAtDate(legs, new Date((departMs + arriveMs) / 2));

    expect(position.legIndex).toBe(0);
    expect(position.t).toBeCloseTo(0.5);
  });

  test('지점에 머무는 중이면 앞 구간에 도착한 상태예요', () => {
    const stayMs = (Date.parse(first.arriveAt) + Date.parse(second.departAt)) / 2;

    expect(calcPositionAtDate(legs, new Date(stayMs))).toEqual({ legIndex: 0, t: 1 });
  });

  test('도착 시각 그대로면 그 구간 도착이에요', () => {
    expect(calcPositionAtDate(legs, first.arriveAt)).toEqual({ legIndex: 0, t: 1 });
  });

  test('마지막 도착보다 뒤면 null(다 그린 상태)이에요', () => {
    expect(calcPositionAtDate(legs, '2099-01-01T00:00:00Z')).toBeNull();
  });

  test('구간이 0개(empty)면 null이에요', () => {
    expect(calcPositionAtDate(empty.legs, '2025-01-01T00:00:00Z')).toBeNull();
  });
});
