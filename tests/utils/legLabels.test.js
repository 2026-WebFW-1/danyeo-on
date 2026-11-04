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

describe('selectVisibleLegLabels', () => {
  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
  ])('%s: 고른 라벨끼리 겹치지 않고 집 표시도 가리지 않아요', (_name, journey) => {
    const rects = selectVisibleLegLabels(journey.legs, journey.home).map(calcLegLabelRect);
    const [homeX, homeY] = mapProjection([journey.home.lng, journey.home.lat]);
    const homeRect = { left: homeX - 16, right: homeX + 16, top: homeY - 16, bottom: homeY + 16 };

    rects.forEach((rect, index) => {
      expect(overlaps(rect, homeRect)).toBe(false);
      rects.slice(index + 1).forEach((other) => expect(overlaps(rect, other)).toBe(false));
    });
  });

  test('비행은 라벨이 없어요', () => {
    const visible = selectVisibleLegLabels(seojin.legs, seojin.home);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((leg) => leg.mode !== 'flight')).toBe(true);
  });

  test('구간이 몰린 곳의 라벨은 숨겨서 전체보다 적어요', () => {
    const groundLegs = seojin.legs.filter((leg) => leg.mode !== 'flight');
    expect(selectVisibleLegLabels(seojin.legs, seojin.home).length).toBeLessThan(groundLegs.length);
  });

  test('재생이 진행돼도 이미 보이던 라벨은 그대로 있어요', () => {
    const { legs, home } = seojin;
    legs.forEach((_leg, index) => {
      const shown = selectVisibleLegLabels(legs.slice(0, index), home);
      const next = selectVisibleLegLabels(legs.slice(0, index + 1), home);
      expect(next.slice(0, shown.length)).toEqual(shown);
    });
  });

  test('구간이 없으면 빈 배열이에요', () => {
    expect(selectVisibleLegLabels([], seojin.home)).toEqual([]);
    expect(selectVisibleLegLabels([], null)).toEqual([]);
  });
});
