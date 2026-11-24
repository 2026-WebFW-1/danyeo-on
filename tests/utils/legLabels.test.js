import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  calcLegLabelRect,
  selectLabelsAtProgress,
  selectLegLabelsByTrip,
  selectVisibleLegLabels,
} from '@/utils/legLabels';
import { selectLegsByPeriod } from '@/utils/periodLegs';
import { mapProjection, splitByProgress } from '@/utils/routeMap';

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

  test('비행으로 고친 구간은 라벨을 남겨요. 라벨에서 다시 고칠 수 있게요', () => {
    const flight = seojin.legs.find((leg) => leg.mode === 'flight' && leg.kind === 'between');
    const userFlight = { ...flight, modeSource: 'user' };

    expect(selectVisibleLegLabels([flight], seojin.home, seojin.stops)).toEqual([]);
    const visible = selectVisibleLegLabels([userFlight], seojin.home, seojin.stops);
    expect(visible.map(({ leg }) => leg)).toEqual([userFlight]);
  });

  test('구간이 몰린 곳의 라벨은 숨겨서 전체보다 적어요', () => {
    const groundLegs = seojin.legs.filter((leg) => leg.mode !== 'flight');
    const visible = selectVisibleLegLabels(seojin.legs, seojin.home, seojin.stops);
    expect(visible.length).toBeLessThan(groundLegs.length);
  });

  describe('왕복(서울 ↔ 여수)은 가는 선과 오는 선이 겹쳐 라벨 자리가 하나예요', () => {
    const yeosuTrip = seojin.trips.find((trip) => trip.name === '여수 · 순천');
    const roundTrip = seojin.legs.filter((leg) => leg.tripId === yeosuTrip.id);
    const [outbound, back] = roundTrip;

    test('둘 다 고칠 수 있으면 먼저 지나온 가는 구간이 자리를 가져가요', () => {
      const visible = selectVisibleLegLabels(roundTrip, seojin.home, seojin.stops);

      expect(roundTrip.map((leg) => leg.kind)).toEqual(['outbound', 'return']);
      expect(visible.map(({ leg }) => leg)).toEqual([outbound]);
    });

    test('재생 중에는 가는 선을 다 그리자마자 라벨이 보여요. 집에 돌아올 때까지 기다리지 않아요', () => {
      const labels = {
        all: selectVisibleLegLabels(roundTrip, seojin.home, seojin.stops),
        byTripId: selectLegLabelsByTrip(roundTrip, seojin.home, seojin.stops),
      };

      const onTheWayBack = { done: [outbound], current: { leg: back, t: 0.5 } };

      const visible = selectLabelsAtProgress(labels, onTheWayBack, seojin.stops);
      expect(visible.map(({ leg }) => leg)).toEqual([outbound]);
    });

    test('3판 전에 저장돼 가는 구간을 못 고치면 고칠 수 있는 오는 구간이 먼저예요', () => {
      const { fromPhotoId: _fromPhotoId, ...oldOutbound } = outbound;

      const visible = selectVisibleLegLabels([oldOutbound, back], seojin.home, seojin.stops);

      expect(visible.map(({ leg }) => leg)).toEqual([back]);
    });
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

describe('selectLegLabelsByTrip (#256)', () => {
  const rect = calcLegLabelRect(trainLeg);
  const [lng, lat] = mapProjection.invert([(rect.left + rect.right) / 2, rect.top + 13]);

  describe('앞선 여행의 라벨이 자리를 모두 차지한 곳이면', () => {
    // 같은 길을 세 번 지나면 라벨을 놓아 볼 자리(가운데 위 · 양 끝 점 위 · 아래)가 모두 차요.
    const earlierLegs = ['a1', 'a2', 'a3'].map((id) => ({ ...trainLeg, id, tripId: 'earlier' }));
    const laterLeg = { ...trainLeg, id: 'b1', tripId: 'later' };
    const legs = [...earlierLegs, laterLeg];

    test('범위 전체로 정하면 뒤 여행의 라벨은 자리가 없어요', () => {
      const visible = selectVisibleLegLabels(legs, null, []);
      expect(visible.map(({ leg }) => leg.id)).not.toContain(laterLeg.id);
    });

    test('여행별로 정하면 뒤 여행의 라벨이 그 여행만 재생할 때와 같은 자리에 나와요', () => {
      const byTripId = selectLegLabelsByTrip(legs, null, []);
      expect(byTripId.get('later')).toEqual(selectVisibleLegLabels([laterLeg], null, []));
      expect(byTripId.get('later')).toEqual([{ leg: laterLeg, rect }]);
    });
  });

  describe('다른 여행의 지점이 라벨 기본 자리에 있으면', () => {
    const blocker = { id: 'blocker', tripId: 'other', lng, lat };
    const labelLeg = { ...trainLeg, id: 'label', tripId: 'mine' };
    const blockerLeg = {
      ...trainLeg,
      id: 'blocker-leg',
      mode: 'flight',
      tripId: 'other',
      to: blocker.id,
    };

    test('앞선 여행의 지점은 점이 찍혀 있어서 피해요', () => {
      const [label] = selectLegLabelsByTrip([blockerLeg, labelLeg], null, [blocker]).get('mine');
      expect(label.leg).toBe(labelLeg);
      expect(overlaps(label.rect, rect)).toBe(false);
    });

    test('뒤 여행의 지점은 아직 점이 없어서 피하지 않아요', () => {
      const [label] = selectLegLabelsByTrip([labelLeg, blockerLeg], null, [blocker]).get('mine');
      expect(label.rect).toEqual(rect);
    });

    test('같은 여행에서 아직 도착하지 않은 지점은 미리 피해요', () => {
      const sameTripLeg = { ...blockerLeg, tripId: 'mine' };
      const sameTripStop = { ...blocker, tripId: 'mine' };
      const [label] = selectLegLabelsByTrip([labelLeg, sameTripLeg], null, [sameTripStop]).get(
        'mine',
      );
      expect(overlaps(label.rect, rect)).toBe(false);
    });
  });

  test('집을 안 들르고 온 구간(gap)은 도착한 지점의 여행에 넣어요', () => {
    const edgeLegs = selectLegsByPeriod(edge, 'all');
    const gapLeg = edgeLegs.find((leg) => leg.kind === 'gap');
    const arrivedTripId = edge.stops.find((stop) => stop.id === gapLeg.to).tripId;
    const byTripId = selectLegLabelsByTrip(edgeLegs, edge.home, edge.stops);

    expect(gapLeg.tripId).toBeNull();
    expect(byTripId.get(arrivedTripId).map(({ leg }) => leg.id)).toContain(gapLeg.id);
  });

  test('구간이 없으면 빈 Map이에요', () => {
    expect(selectLegLabelsByTrip([], seojin.home, seojin.stops).size).toBe(0);
  });
});

describe('selectLabelsAtProgress (#256)', () => {
  // seojin 2Y에서 자리를 얻는 라벨은 밴쿠버 → 밴프(차 552km)와 그 뒤 졸업 여행의 파리 → 런던(기차 343km)이에요.
  const legs = selectLegsByPeriod(seojin, '2y');
  const labels = selectVisibleLegLabels(legs, seojin.home, seojin.stops);
  const banffIndex = legs.findIndex((leg) => Math.round(leg.km) === 552 && leg.mode === 'car');
  const londonIndex = legs.findIndex((leg) => Math.round(leg.km) === 343 && leg.mode === 'train');

  function selectAt(progress, journey = seojin, journeyLegs = legs) {
    return selectLabelsAtProgress(
      {
        all: selectVisibleLegLabels(journeyLegs, journey.home, journey.stops),
        byTripId: selectLegLabelsByTrip(journeyLegs, journey.home, journey.stops),
      },
      splitByProgress(journeyLegs, progress),
      journey.stops,
    ).map(({ leg }) => leg.id);
  }

  test('fixture에 두 여행의 라벨이 차례로 있어요', () => {
    expect(labels.map(({ leg }) => leg.id)).toEqual([legs[banffIndex].id, legs[londonIndex].id]);
    expect(legs[banffIndex].tripId).not.toBe(legs[londonIndex].tripId);
  });

  test('구간에 도착해야 라벨이 나와요', () => {
    expect(selectAt({ legIndex: banffIndex, t: 0.5 })).toEqual([]);
    expect(selectAt({ legIndex: banffIndex, t: 1 })).toEqual([legs[banffIndex].id]);
  });

  test('같은 여행을 재생하는 동안에는 지나온 라벨이 남아요', () => {
    expect(legs[banffIndex + 1].tripId).toBe(legs[banffIndex].tripId);
    expect(selectAt({ legIndex: banffIndex + 1, t: 0.5 })).toEqual([legs[banffIndex].id]);
  });

  test('다음 여행으로 넘어가면 앞선 여행의 라벨은 사라져요', () => {
    const nextTripIndex = legs.findIndex(
      (leg, index) => index > banffIndex && leg.tripId !== legs[banffIndex].tripId,
    );
    expect(selectAt({ legIndex: nextTripIndex, t: 0 })).toEqual([]);
    expect(selectAt({ legIndex: londonIndex, t: 1 })).toEqual([legs[londonIndex].id]);
  });

  test('다 그린 상태(progress null)면 모든 라벨을 돌려줘요', () => {
    expect(selectAt(null)).toEqual(labels.map(({ leg }) => leg.id));
  });

  test('재생 중에는 지금 여행만으로 정한 자리를, 다 그린 상태에서는 범위 전체로 정한 자리를 써요', () => {
    // 앞선 여행이 같은 길을 세 번 지나 자리를 모두 차지해도, 뒤 여행을 재생할 때는 그 라벨이 나와요.
    const earlierLegs = ['a1', 'a2', 'a3'].map((id) => ({ ...trainLeg, id, tripId: 'earlier' }));
    const laterLeg = { ...trainLeg, id: 'b1', tripId: 'later' };
    const tripLegs = [...earlierLegs, laterLeg];
    const placed = {
      all: selectVisibleLegLabels(tripLegs, null, []),
      byTripId: selectLegLabelsByTrip(tripLegs, null, []),
    };
    const selectIdsAt = (progress) =>
      selectLabelsAtProgress(placed, splitByProgress(tripLegs, progress), []).map(
        ({ leg }) => leg.id,
      );

    expect(selectIdsAt({ legIndex: 3, t: 1 })).toEqual([laterLeg.id]);
    expect(selectIdsAt(null)).not.toContain(laterLeg.id);
  });

  describe('집을 안 들르고 온 구간(gap)', () => {
    // edge: 방콕 → 치앙마이(기차 586km)가 gap이고, 치앙마이 여행은 이 구간으로 시작해요.
    const edgeLegs = selectLegsByPeriod(edge, 'all');
    const gapIndex = edgeLegs.findIndex((leg) => leg.kind === 'gap');
    const gapLeg = edgeLegs[gapIndex];
    const selectEdgeAt = (progress) => selectAt(progress, edge, edgeLegs);

    test('도착한 여행의 라벨로 봐서, 그 여행을 재생하는 동안 남아요', () => {
      expect(gapLeg.tripId).toBeNull();
      expect(edgeLegs[gapIndex + 1].tripId).not.toBeNull();
      expect(selectEdgeAt({ legIndex: gapIndex, t: 1 })).toEqual([gapLeg.id]);
      expect(selectEdgeAt({ legIndex: gapIndex + 1, t: 0.5 })).toEqual([gapLeg.id]);
    });

    test('그 여행이 끝나고 다음 여행을 재생하면 사라져요', () => {
      const arrivedTripId = edgeLegs[gapIndex + 1].tripId;
      const nextTripIndex = edgeLegs.findIndex(
        (leg, index) => index > gapIndex + 1 && leg.tripId !== arrivedTripId,
      );
      expect(selectEdgeAt({ legIndex: nextTripIndex, t: 0.5 })).not.toContain(gapLeg.id);
    });
  });
});
