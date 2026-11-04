import { describe, expect, test } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  buildDateTrack,
  buildTimeline,
  calcElapsedAtTime,
  calcElapsedMs,
  calcMoveMs,
  calcPosition,
  calcPositionAtDate,
  calcPositionAtStop,
  calcTimeAtElapsed,
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

describe('buildDateTrack', () => {
  const track = buildDateTrack(legs, timeline);

  test.each([
    ['seojin', seojin],
    ['heavy', heavy],
  ])('%s: 재생 시간과 실제 시각이 끊기지 않고 앞으로만 가요', (_name, journey) => {
    const journeyTrack = buildDateTrack(journey.legs, buildTimeline(journey.legs));
    journeyTrack.slice(1).forEach((segment, index) => {
      const prev = journeyTrack[index];
      expect(segment.startMs).toBe(prev.endMs);
      expect(segment.fromTime).toBe(prev.toTime);
      expect(segment.toTime).toBeGreaterThanOrEqual(segment.fromTime);
    });
  });

  test('집에 있던 기간은 다음 이동에 얹어서 한 번에 튀지 않아요', () => {
    const homeIndex = legs.findIndex((leg, index) => leg.to === 'home' && legs[index + 1]);
    const arrivedHome = Date.parse(legs[homeIndex].arriveAt);
    const next = track.find((segment) => segment.startMs === steps[homeIndex + 1].startMs);

    expect(next.fromTime).toBe(arrivedHome);
    expect(next.toTime).toBe(Date.parse(legs[homeIndex + 1].arriveAt));
  });

  test('구간이 0개면 빈 배열이에요', () => {
    expect(buildDateTrack(empty.legs, buildTimeline(empty.legs))).toEqual([]);
  });
});

describe('calcTimeAtElapsed', () => {
  const track = buildDateTrack(legs, timeline);

  test('처음은 첫 출발, 끝은 마지막 도착이에요', () => {
    expect(calcTimeAtElapsed(track, 0)).toBe(Date.parse(legs[0].departAt));
    expect(calcTimeAtElapsed(track, Infinity)).toBe(Date.parse(legs.at(-1).arriveAt));
  });

  test('머무는 동안에도 날짜가 도착과 다음 출발 사이에서 움직여요', () => {
    const { startMs, moveMs, stayMs } = steps[0];
    const middle = calcTimeAtElapsed(track, startMs + moveMs + stayMs / 2);

    expect(middle).toBeGreaterThan(Date.parse(legs[0].arriveAt));
    expect(middle).toBeLessThan(Date.parse(legs[1].departAt));
  });

  test('구간이 0개면 null이에요', () => {
    expect(calcTimeAtElapsed([], 0)).toBeNull();
  });
});

describe('calcElapsedAtTime', () => {
  const track = buildDateTrack(legs, timeline);

  test.each([[0.1], [0.37], [0.5], [0.82]])(
    '전체의 %s 지점에서 재생 시간 → 날짜 → 재생 시간이 제자리로 돌아와요',
    (ratio) => {
      const elapsedMs = timeline.totalMs * ratio;
      const time = calcTimeAtElapsed(track, elapsedMs);
      expect(calcElapsedAtTime(track, time)).toBeCloseTo(elapsedMs, 3);
    },
  );

  test('첫 출발보다 앞이면 0이고, 마지막 도착보다 뒤면 마지막 지점에 머무는 상태예요', () => {
    expect(calcElapsedAtTime(track, 0)).toBe(0);

    const elapsedMs = calcElapsedAtTime(track, Date.parse(legs.at(-1).arriveAt) + 1000);
    expect(elapsedMs).toBe(timeline.totalMs);
    expect(calcPosition(timeline, elapsedMs)).not.toBeNull();
  });

  test('구간이 0개면 다 그린 상태예요', () => {
    expect(calcElapsedAtTime([], 0)).toBe(Infinity);
  });
});

describe('calcPositionAtStop', () => {
  test('그 지점에 도착하는 구간의 t: 1이에요', () => {
    expect(calcPositionAtStop(legs, legs[0].to)).toEqual({ legIndex: 0, t: 1 });
  });

  test('도착하는 구간이 없으면 null이에요', () => {
    expect(calcPositionAtStop(legs, 'none')).toBeNull();
  });
});
