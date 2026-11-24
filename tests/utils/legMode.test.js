import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { canEditLegMode, legMode, toModeCorrection } from '@/utils/legMode';

/** 구간 한쪽 끝이에요. 나라 코드는 지점에서, 집이면 Journey.home에서 읽어요. */
function endOf(journey, id, [lat, lng]) {
  const cc = id === 'home' ? journey.home.cc : journey.stops.find((s) => s.id === id).cc;
  return { cc, lat, lng };
}

/** 저장된 구간으로 이동 수단을 다시 정해요. 사진 사이 시간은 사진으로 시각을 잰 구간에만 있어요. */
const autoMode = (journey, leg) =>
  legMode(leg.km, {
    from: endOf(journey, leg.from, leg.fromLatLng),
    to: endOf(journey, leg.to, leg.toLatLng),
    maxHours: leg.timing === 'photos' ? leg.hours : undefined,
  });

const SEOUL = { cc: 'KR', lat: 37.56, lng: 126.98 };
const BUSAN = { cc: 'KR', lat: 35.18, lng: 129.07 };
const JEJU = { cc: 'KR', lat: 33.5, lng: 126.53 };
const SEOGWIPO = { cc: 'KR', lat: 33.25, lng: 126.56 };
const FUKUOKA = { cc: 'JP', lat: 33.59, lng: 130.4 };
const OSAKA = { cc: 'JP', lat: 34.69, lng: 135.5 };
const NAHA = { cc: 'JP', lat: 26.21, lng: 127.68 };
const PARIS = { cc: 'FR', lat: 48.86, lng: 2.35 };
const LONDON = { cc: 'GB', lat: 51.51, lng: -0.13 };
const BRUSSELS = { cc: 'BE', lat: 50.85, lng: 4.35 };
const SEVILLE = { cc: 'ES', lat: 37.39, lng: -5.98 };
const TANGIER = { cc: 'MA', lat: 35.76, lng: -5.83 };
const TORONTO = { cc: 'CA', lat: 43.65, lng: -79.38 };
const NEW_YORK = { cc: 'US', lat: 40.71, lng: -74.01 };

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
    ['서울 → 후쿠오카', SEOUL, FUKUOKA, 545, 'flight'],
    ['후쿠오카 → 서울', FUKUOKA, SEOUL, 544, 'flight'],
    ['부산 → 후쿠오카', BUSAN, FUKUOKA, 214, 'flight'],
    ['세비야 → 탕헤르(대륙이 달라요)', SEVILLE, TANGIER, 182, 'flight'],
    ['파리 → 런던(해저 터널)', PARIS, LONDON, 343, 'train'],
    ['파리 → 브뤼셀', PARIS, BRUSSELS, 264, 'train'],
    ['토론토 → 뉴욕', TORONTO, NEW_YORK, 549, 'train'],
  ])('#247 육로로 못 가는 두 나라는 가까워도 비행이에요: %s', (_, from, to, km, mode) => {
    expect(legMode(km, { from, to })).toBe(mode);
  });

  test.each([
    ['서울 → 제주', SEOUL, JEJU, 452, 'flight'],
    ['제주 → 부산', JEJU, BUSAN, 300, 'flight'],
    ['오사카 → 나하', OSAKA, NAHA, 650, 'flight'],
    ['제주 → 서귀포(섬 안)', JEJU, SEOGWIPO, 28, 'car'],
    ['오사카 → 후쿠오카(같은 나라 본토)', OSAKA, FUKUOKA, 485, 'train'],
    ['서울 → 부산', SEOUL, BUSAN, 325, 'train'],
  ])('같은 나라여도 섬을 드나들면 비행이에요: %s', (_, from, to, km, mode) => {
    expect(legMode(km, { from, to })).toBe(mode);
  });

  test.each([
    [400, 2, 'flight'], // 200km/h
    [300, 2, 'train'], // 딱 150km/h는 비행이 아니에요
    [300, 1.9, 'flight'],
    [100, 0.5, 'flight'],
    [100, 30, 'car'], // 사진 사이가 길면 속도가 낮게 나와 거리로 정해요
    [400, 0, 'train'], // 시간이 0 이하면 속도를 잴 수 없어요
    [400, -3, 'train'],
    [400, undefined, 'train'],
  ])('%skm를 사진 사이 %s시간에 갔으면 %s', (km, maxHours, mode) => {
    expect(legMode(km, { from: SEOUL, to: BUSAN, maxHours })).toBe(mode);
  });

  test.each([
    ['나라 코드가 빈 글자', { ...SEOUL, cc: '' }, FUKUOKA],
    ['나라 코드가 없음', { lat: SEOUL.lat, lng: SEOUL.lng }, FUKUOKA],
    ['표에 없는 나라', { ...SEOUL, cc: 'ZZ' }, { ...BUSAN, cc: 'YY' }],
  ])('나라를 모르면 나라 규칙을 건너뛰고 거리로 정해요: %s', (_, from, to) => {
    expect(legMode(545, { from, to })).toBe('train');
  });

  test('좌표를 모르면 섬 규칙만 건너뛰어요', () => {
    expect(legMode(452, { from: { cc: 'KR' }, to: { cc: 'KR' } })).toBe('train');
    expect(legMode(545, { from: { cc: 'KR' }, to: { cc: 'JP' } })).toBe('flight');
  });

  test.each([
    ['home', '방콕', 3717, 'flight'],
    ['home', '후쿠오카', 545, 'flight'],
    ['후쿠오카', 'home', 544, 'flight'],
    ['파리', '런던', 343, 'train'],
    ['속초', 'home', 154, 'train'],
    ['부산', '경주', 79, 'car'],
  ])('seojin %s → %s(%skm)면 %s', (from, to, km, mode) => {
    const leg = findLeg(seojin, from, to);

    expect(leg.km).toBe(km);
    expect(autoMode(seojin, leg)).toBe(mode);
  });

  test.each([
    ['seojin', seojin],
    ['edge', edge],
    ['heavy', heavy],
    ['empty', empty],
  ])('%s의 자동 판정 구간은 모두 fixture의 mode와 같아요', (_, journey) => {
    const autoLegs = journey.legs.filter((leg) => leg.modeSource === 'auto');

    expect(autoLegs.map((leg) => autoMode(journey, leg))).toEqual(autoLegs.map((leg) => leg.mode));
  });

  test('사용자가 고친 구간은 규칙과 달라도 비교에서 빠져요 (seojin 밴쿠버 → 밴프)', () => {
    const leg = findLeg(seojin, '밴쿠버', '밴프');

    expect(leg).toMatchObject({ km: 552, mode: 'car', modeSource: 'user' });
    expect(legMode(leg.km)).toBe('train');
  });
});

describe('canEditLegMode', () => {
  test('집에서 나가는 구간은 고칠 수 없어요(buildJourney가 집 출발 구간의 보정을 보지 않아서)', () => {
    expect(canEditLegMode(findLeg(seojin, 'home', '부산'))).toBe(false);
  });

  test('지점에서 출발하는 구간은 고칠 수 있어요. 집으로 돌아오는 구간도요', () => {
    expect(canEditLegMode(findLeg(seojin, '부산', '경주'))).toBe(true);
    expect(canEditLegMode(findLeg(seojin, '경주', 'home'))).toBe(true);
  });
});

describe('toModeCorrection', () => {
  test('출발 지점 ID를 fromPhotoId로 써요. 지점 ID는 그 지점의 첫 사진이라 buildJourney가 찾을 수 있어요', () => {
    const leg = findLeg(seojin, '부산', '경주');
    const from = seojin.stops.find((stop) => stop.id === leg.from);

    const correction = toModeCorrection(leg, 'train');

    expect(correction).toEqual({ type: 'mode', fromPhotoId: leg.from, mode: 'train' });
    expect(from.photoIds).toContain(correction.fromPhotoId);
  });
});
