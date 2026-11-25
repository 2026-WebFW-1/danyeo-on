import { describe, expect, test } from 'vitest';

import { DEFAULT_PERIOD } from '@/constants/journey';
import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  calcAxisRatio,
  calcYearTicks,
  countLegsByMode,
  formatDotDate,
  formatPeriodRange,
  formatTripRange,
  getPlaceName,
  parsePeriod,
  selectArrivalStops,
  selectChapterSpans,
} from '@/utils/mapScreen';
import { buildTimeline, calcPosition } from '@/utils/playback';
import { selectLegsByTrip } from '@/utils/tripLegs';

describe('parsePeriod', () => {
  test('아는 기간은 그대로예요', () => {
    expect(parsePeriod('1y')).toBe('1y');
    expect(parsePeriod('all')).toBe('all');
  });

  test.each([[null], ['3y'], ['ALL'], ['']])('%s는 기본 기간이에요', (value) => {
    expect(parsePeriod(value)).toBe(DEFAULT_PERIOD);
  });
});

describe('formatPeriodRange', () => {
  test('연·월만 남기고 월 앞의 0을 빼요', () => {
    expect(formatPeriodRange({ from: '2024-08-16', to: '2026-10-01' })).toBe(
      '2024년 8월 – 2026년 10월',
    );
  });
});

describe('formatDotDate', () => {
  test('브라우저 시간대와 상관없이 현지 날짜예요', () => {
    expect(formatDotDate('2026-02-14T23:30:00-07:00')).toBe('2026.02.14');
  });
});

describe('formatTripRange', () => {
  test('시작과 끝을 현지 날짜로 보여 줘요', () => {
    expect(
      formatTripRange({ from: '2025-06-28T18:30:51-07:00', to: '2025-08-26T09:00:00-07:00' }),
    ).toBe('2025.06.28 – 2025.08.26');
  });

  test('해가 바뀌어도 양쪽에 연도를 써요', () => {
    expect(
      formatTripRange({ from: '2025-12-26T10:00:00+09:00', to: '2026-01-08T20:00:00+09:00' }),
    ).toBe('2025.12.26 – 2026.01.08');
  });

  test('하루짜리는 날짜 하나만 보여 줘요', () => {
    expect(
      formatTripRange({ from: '2025-03-06T09:00:00+09:00', to: '2025-03-06T21:00:00+09:00' }),
    ).toBe('2025.03.06');
  });
});

describe('countLegsByMode', () => {
  test('모든 구간을 한 번씩 세요', () => {
    const counts = countLegsByMode(seojin.legs);
    expect(counts.flight + counts.train + counts.car).toBe(seojin.legs.length);
  });

  test('구간이 없으면 모두 0이에요', () => {
    expect(countLegsByMode([])).toEqual({ flight: 0, train: 0, car: 0 });
  });
});

describe('getPlaceName', () => {
  test('집은 집의 도시, 지점은 지점의 도시예요', () => {
    const [stop] = seojin.stops;
    expect(getPlaceName(seojin.home, seojin.stops, 'home')).toBe(seojin.home.city);
    expect(getPlaceName(seojin.home, seojin.stops, stop.id)).toBe(stop.city);
  });

  test('찾지 못하면 빈 문자열이에요', () => {
    expect(getPlaceName(null, [], 'home')).toBe('');
    expect(getPlaceName(seojin.home, seojin.stops, 'none')).toBe('');
  });
});

describe('selectArrivalStops', () => {
  const { legs, stops } = seojin;
  const stopLegIndexes = legs.flatMap((leg, index) => (leg.to === 'home' ? [] : [index]));

  test('이동 중이거나 다 그린 상태면 없어요', () => {
    expect(selectArrivalStops(legs, stops, { legIndex: 0, t: 0.5 })).toEqual([]);
    expect(selectArrivalStops(legs, stops, null)).toEqual([]);
  });

  test('집에 돌아오면 없어요', () => {
    const legIndex = legs.findIndex((leg) => leg.to === 'home');
    expect(selectArrivalStops(legs, stops, { legIndex, t: 1 })).toEqual([]);
  });

  test('첫 지점이면 한 장이에요', () => {
    const result = selectArrivalStops(legs, stops, { legIndex: stopLegIndexes[0], t: 1 });
    expect(result.map((stop) => stop.id)).toEqual([legs[stopLegIndexes[0]].to]);
  });

  test('맨 앞이 지금 지점이고 앞 지점까지 최대 3장이에요', () => {
    const [third, second, first] = stopLegIndexes.slice(2, 5).reverse();
    const result = selectArrivalStops(legs, stops, { legIndex: third, t: 1 });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(legs[third].to);
    expect(second).toBeLessThan(third);
    expect(first).toBeLessThan(second);
    expect(new Date(result[1].from).getTime()).toBeLessThan(new Date(result[0].from).getTime());
  });

  test('경유지에 도착하면 없고, 앞 지점 카드에도 넣지 않아요', () => {
    const transitIds = new Set(edge.stops.filter((stop) => stop.transit).map((stop) => stop.id));
    expect(transitIds.size).toBeGreaterThan(0);

    edge.legs.forEach((leg, legIndex) => {
      const result = selectArrivalStops(edge.legs, edge.stops, { legIndex, t: 1 });
      if (transitIds.has(leg.to)) expect(result).toEqual([]);
      expect(result.some((stop) => stop.transit)).toBe(false);
    });
  });

  test('구간 번호가 범위를 넘어도 터지지 않아요', () => {
    expect(selectArrivalStops([], stops, { legIndex: 3, t: 1 })).toEqual([]);
    expect(selectArrivalStops([], stops, { legIndex: 0, t: 0 })).toEqual([]);
  });

  test('이동을 시작하는 순간(t: 0)에는 없어요', () => {
    legs.forEach((_, legIndex) => {
      expect(selectArrivalStops(legs, stops, { legIndex, t: 0 })).toEqual([]);
    });
  });

  // 계정의 첫 사진이 여행지면 집 → 첫 지점 구간이 없어서 첫 지점은 구간의 from으로만 나와요(#265).
  describe('도착하는 구간이 없는 첫 지점', () => {
    const noArrival = legs.slice(1);
    const firstStop = stops.find((stop) => stop.id === legs[0].to);

    test('그 지점을 떠나는 첫 구간의 시작(t: 0)에서 한 장이에요', () => {
      const result = selectArrivalStops(noArrival, stops, { legIndex: 0, t: 0 });
      expect(result.map((stop) => stop.id)).toEqual([firstStop.id]);
    });

    test('재생 처음에 머무는 동안 카드가 떠 있어요', () => {
      const timeline = buildTimeline(noArrival);
      const position = calcPosition(timeline, 1000);
      expect(selectArrivalStops(noArrival, stops, position).map((stop) => stop.id)).toEqual([
        firstStop.id,
      ]);
      const moving = calcPosition(timeline, timeline.steps[0].startMs + 100);
      expect(selectArrivalStops(noArrival, stops, moving)).toEqual([]);
    });

    test('집에서 떠나는 일정은 처음에 카드가 없어요', () => {
      expect(selectArrivalStops(legs, stops, calcPosition(buildTimeline(legs), 0))).toEqual([]);
    });

    test('이동을 시작하면 카드가 없어요', () => {
      expect(selectArrivalStops(noArrival, stops, { legIndex: 0, t: 0.5 })).toEqual([]);
    });

    test('뒤 지점에 도착하면 첫 지점이 앞 지점 카드로 깔려요', () => {
      const result = selectArrivalStops(noArrival, stops, { legIndex: 0, t: 1 });
      expect(result.map((stop) => stop.id)).toEqual([noArrival[0].to, firstStop.id]);
    });

    test('같은 지점에서 떠나는 구간이 또 있어도 한 번만 넣어요', () => {
      const [first, second, third] = stops;
      const twice = [
        { ...legs[1], from: first.id, to: second.id },
        { ...legs[2], from: first.id, to: third.id },
      ];
      const result = selectArrivalStops(twice, stops, { legIndex: 1, t: 1 });
      expect(result.map((stop) => stop.id)).toEqual([third.id, second.id, first.id]);
      expect(selectArrivalStops(twice, stops, { legIndex: 1, t: 0 })).toEqual([]);
    });
  });
});

describe('selectArrivalStops (gap 구간으로 시작하는 여행)', () => {
  const tripLegs = selectLegsByTrip(edge, 'p_6e3edd');

  test('앞 여행의 마지막 지점은 카드에 넣지 않아요', () => {
    expect(tripLegs[0].kind).toBe('gap');
    const result = selectArrivalStops(tripLegs, edge.stops, { legIndex: 0, t: 1 });
    expect(result.map((stop) => stop.id)).toEqual([tripLegs[0].to]);
  });

  test('이동을 시작하는 순간(t: 0)에는 카드가 없어요', () => {
    expect(selectArrivalStops(tripLegs, edge.stops, { legIndex: 0, t: 0 })).toEqual([]);
  });
});

describe('selectChapterSpans', () => {
  test('챕터 지점의 기간을 돌려줘요', () => {
    const chapter = seojin.stops.find((stop) => stop.chapter);
    const [span] = selectChapterSpans(seojin.legs, seojin.stops);
    expect(span.id).toBe(chapter.id);
    expect(span.toTime).toBeGreaterThan(span.fromTime);
  });

  test('지금 구간으로 도착하지 않는 챕터는 빼요', () => {
    expect(selectChapterSpans([], seojin.stops)).toEqual([]);
  });
});

describe('calcAxisRatio', () => {
  test('양 끝 밖이면 0과 1에 멈춰요', () => {
    expect(calcAxisRatio(5, 10, 20)).toBe(0);
    expect(calcAxisRatio(15, 10, 20)).toBe(0.5);
    expect(calcAxisRatio(25, 10, 20)).toBe(1);
  });

  test('길이가 0이어도 NaN이 나오지 않아요', () => {
    expect(calcAxisRatio(10, 10, 10)).toBe(0);
  });
});

describe('calcYearTicks', () => {
  test('맨 왼쪽은 시작 연도이고 그 뒤로 해마다 눈금이 있어요', () => {
    const ticks = calcYearTicks('2024-08-16T00:00:00+09:00', Date.UTC(2026, 7, 16));
    expect(ticks.map((tick) => tick.year)).toEqual([2024, 2025, 2026]);
    expect(ticks[0].ratio).toBe(0);
    expect(ticks[1].ratio).toBeLessThan(ticks[2].ratio);
  });

  test('다음 해 눈금이 너무 가까우면 시작 연도를 빼서 글자가 겹치지 않아요', () => {
    const ticks = calcYearTicks('2025-12-30T00:00:00+09:00', Date.UTC(2026, 11, 30));
    expect(ticks.map((tick) => tick.year)).toEqual([2026]);
  });

  test('한 해 안이면 눈금은 하나예요', () => {
    const ticks = calcYearTicks('2025-03-01T00:00:00+09:00', Date.UTC(2025, 8, 1));
    expect(ticks).toEqual([{ year: 2025, ratio: 0 }]);
  });
});
