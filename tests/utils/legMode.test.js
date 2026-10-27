import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { legMode } from '@/utils/legMode';

/** 도시 이름 두 개로 구간을 찾아요. 집은 'home'으로 적어요. */
function findLeg(journey, fromCity, toCity) {
  const cityOf = (id) => (id === 'home' ? 'home' : journey.stops.find((s) => s.id === id).city);
  return journey.legs.find((leg) => cityOf(leg.from) === fromCity && cityOf(leg.to) === toCity);
}

describe('legMode', () => {
  test.each([
    [701, 'flight'],
    [700, 'train'],
    [699, 'train'],
    [151, 'train'],
    [150, 'train'],
    [149, 'car'],
    [0, 'car'],
  ])('%skm면 %s', (km, mode) => {
    expect(legMode(km)).toBe(mode);
  });

  test.each([
    ['home', '방콕', 3717, 'flight'],
    ['속초', 'home', 154, 'train'],
    ['부산', '경주', 79, 'car'],
  ])('seojin %s → %s(%skm)면 %s', (from, to, km, mode) => {
    const leg = findLeg(seojin, from, to);

    expect(leg.km).toBe(km);
    expect(legMode(leg.km)).toBe(mode);
  });

  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
    ['empty', empty],
  ])('%s의 자동 판정 구간은 모두 fixture의 mode와 같아요', (_, journey) => {
    const autoLegs = journey.legs.filter((leg) => leg.modeSource === 'auto');

    expect(autoLegs.map((leg) => legMode(leg.km))).toEqual(autoLegs.map((leg) => leg.mode));
  });

  test('사용자가 고친 구간은 규칙과 달라도 비교에서 빠져요 (seojin 밴쿠버 → 밴프)', () => {
    const leg = findLeg(seojin, '밴쿠버', '밴프');

    expect(leg).toMatchObject({ km: 552, mode: 'car', modeSource: 'user' });
    expect(legMode(leg.km)).toBe('train');
  });
});
