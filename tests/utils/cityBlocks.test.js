import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { selectCityBlocks } from '@/utils/cityBlocks';

const seojinTripId = seojin.trips.find((trip) => trip.name === '밴쿠버 · 밴프').id;

describe('selectCityBlocks', () => {
  const blocks = selectCityBlocks(seojin, seojinTripId, seojinSeed.posts, seojinSeed.photos);

  test('밴쿠버 · 밴프: 지점 두 곳이 시간 순서로 나와요', () => {
    expect(blocks.map((block) => [block.no, block.stop.city])).toEqual([
      ['01', '밴쿠버'],
      ['02', '밴프'],
    ]);
  });

  test('첫 지점은 집에서 오는 구간, 둘째는 앞 지점에서 오는 구간이 라벨이에요', () => {
    expect(blocks.map((block) => block.inboundLabel)).toEqual(['비행 · 8,162km', '차 · 552km']);
  });

  test('날짜 범위와 영어 나라 이름을 만들어요', () => {
    expect(blocks[0].dateRange).toBe('2025.06.28 — 08.23');
    expect(blocks[1].dateRange).toBe('2025.08.25 — 08.26');
    expect(blocks[1].startDate).toBe('2025.08.25');
    expect(blocks.map((block) => block.countryLabel)).toEqual(['Canada', 'Canada']);
  });

  test('선 굵기와 점 크기는 거리와 머문 날에 맞아요', () => {
    expect(blocks[0].lineWidth).toBeGreaterThan(blocks[1].lineWidth);
    expect(blocks[0].dotSize).toBeGreaterThan(blocks[1].dotSize);
    expect(blocks[1].lineWidth).toBeCloseTo(1.2, 1);
  });

  test('그 지점의 글과 한 줄 글을 골라요(밴쿠버 7개, 밴프 1개)', () => {
    expect(blocks.map((block) => block.posts.length)).toEqual([7, 1]);
    expect(blocks[0].oneLiner).toBe(blocks[0].posts[0].body);
  });

  test('사진 목록과 대표 사진 번호를 줘요', () => {
    expect(blocks[0].photos).toHaveLength(6);
    expect(blocks[0].photos[blocks[0].coverIndex].fileKey).toBe(blocks[0].stop.coverFileKey);
  });

  test('글과 사진을 아직 못 받았어도 만들어져요(글 없음, 대표 사진 한 장)', () => {
    const early = selectCityBlocks(seojin, seojinTripId, [], []);

    expect(early[0].oneLiner).toBeNull();
    expect(early[0].posts).toEqual([]);
    expect(early[0].photos).toHaveLength(1);
    expect(early[0].coverIndex).toBe(0);
  });

  test('없는 여행이면 빈 배열이에요', () => {
    expect(selectCityBlocks(seojin, 'nope', seojinSeed.posts, seojinSeed.photos)).toEqual([]);
  });

  test('journey가 없어도 빈 배열이에요', () => {
    expect(selectCityBlocks(null, seojinTripId, [], [])).toEqual([]);
  });

  test('edge 모든 여행의 블록이 오류 없이 만들어져요', () => {
    for (const trip of edge.trips) {
      expect(() => selectCityBlocks(edge, trip.id, [], [])).not.toThrow();
    }
  });
});
