import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { calcLegLabelRect, selectVisibleLegLabels } from '@/utils/legLabels';
import { mapProjection } from '@/utils/routeMap';

/** 두 자리가 겹치는지 봐요. 코드의 틈(LABEL_GAP)은 빼고 진짜 겹침만 봐요. */
function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

const trainLeg = seojin.legs.find((leg) => leg.mode === 'train');

describe('calcLegLabelRect', () => {
  test('글자가 길수록 넓어요', () => {
    const short = calcLegLabelRect({ ...trainLeg, mode: 'car', km: 9 });
    const long = calcLegLabelRect({ ...trainLeg, mode: 'train', km: 12345 });
    expect(long.right - long.left).toBeGreaterThan(short.right - short.left);
  });
});

/** 지도에 점으로 찍히는 지점의 좌표예요. */
function calcDotPoints({ legs, stops }) {
  const ids = new Set(legs.flatMap((leg) => [leg.from, leg.to]));
  return stops
    .filter((stop) => !stop.transit && ids.has(stop.id))
    .map((stop) => mapProjection([stop.lng, stop.lat]));
}

describe('selectVisibleLegLabels', () => {
  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: 고른 라벨끼리 겹치지 않고 집 표시와 지점 점도 가리지 않아요', (_name, journey) => {
    const rects = selectVisibleLegLabels(journey.legs, journey.home, journey.stops).map(
      ({ rect }) => rect,
    );
    const [homeX, homeY] = mapProjection([journey.home.lng, journey.home.lat]);
    const homeRect = { left: homeX - 16, right: homeX + 16, top: homeY - 16, bottom: homeY + 16 };
    const dotRects = calcDotPoints(journey).map(([x, y]) => ({
      left: x - 4,
      right: x + 4,
      top: y - 4,
      bottom: y + 4,
    }));

    rects.forEach((rect, index) => {
      expect(overlaps(rect, homeRect)).toBe(false);
      dotRects.forEach((dot) => expect(overlaps(rect, dot)).toBe(false));
      rects.slice(index + 1).forEach((other) => expect(overlaps(rect, other)).toBe(false));
    });
  });

  test('비행은 라벨이 없어요', () => {
    const visible = selectVisibleLegLabels(seojin.legs, seojin.home, seojin.stops);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every(({ leg }) => leg.mode !== 'flight')).toBe(true);
  });

  test('구간이 몰린 곳의 라벨은 숨겨서 전체보다 적어요', () => {
    const groundLegs = seojin.legs.filter((leg) => leg.mode !== 'flight');
    const visible = selectVisibleLegLabels(seojin.legs, seojin.home, seojin.stops);
    expect(visible.length).toBeLessThan(groundLegs.length);
  });

  test('가운데 위가 자기 양 끝 점에 걸리면 점 바깥으로 비켜요', () => {
    const visible = selectVisibleLegLabels(seojin.legs, seojin.home, seojin.stops);
    const moved = visible.find(({ leg, rect }) => rect.top !== calcLegLabelRect(leg).top);
    expect(moved).toBeDefined();
    expect(moved.rect.left).toBe(calcLegLabelRect(moved.leg).left);
  });

  describe('뒤 구간의 도착지가 라벨 기본 자리에 있으면', () => {
    const rect = calcLegLabelRect(trainLeg);
    const [lng, lat] = mapProjection.invert([(rect.left + rect.right) / 2, rect.top + 13]);
    const blocker = { id: 'blocker', lng, lat };
    const nextLeg = { ...trainLeg, id: 'next', mode: 'flight', to: blocker.id };

    test('아직 도착하기 전이어도 그 점을 미리 피해요', () => {
      const [label] = selectVisibleLegLabels([trainLeg, nextLeg], null, [blocker]);
      expect(label.leg).toBe(trainLeg);
      expect(overlaps(label.rect, rect)).toBe(false);
    });

    test('경유지는 점이 없어서 피하지 않아요', () => {
      const transit = { ...blocker, transit: true };
      const [label] = selectVisibleLegLabels([trainLeg, nextLeg], null, [transit]);
      expect(label.rect).toEqual(rect);
    });
  });

  test('구간이 없으면 빈 배열이에요', () => {
    expect(selectVisibleLegLabels([], seojin.home, seojin.stops)).toEqual([]);
    expect(selectVisibleLegLabels([], null, [])).toEqual([]);
  });
});
