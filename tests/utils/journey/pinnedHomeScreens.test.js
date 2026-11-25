import { beforeAll, describe, expect, test } from 'vitest';

import pinnedHome from '../../fixtures/journey/pinned-home.json';
import { calcDistanceKm } from '@/utils/distance';
import { buildJourney } from '@/utils/journey/buildJourney';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { canEditLegMode } from '@/utils/legMode';
import { selectPassportCalendar } from '@/utils/passportCalendar';
import { selectPassportRecords } from '@/utils/passportRecords';
import { groupOutings, selectPassportStamps } from '@/utils/passportStamps';
import { selectPassportStats } from '@/utils/passportStats';
import { hasLeadingStay } from '@/utils/playback';

// 집을 직접 지정한 계정의 Journey로, 03 · 05 · 01이 쓰는 계산이 끼운 집과 맞는지 봐요.
// pinned-home.json: 도쿄 → 방콕 사이에 집이 끼고, 방콕 → 다낭은 시간이 부족해 gap이에요(집 지정 사진은 p_s1).
const CITIES = [
  { lat: 37.5, lng: 127, city: '서울', country: '한국', cc: 'KR' },
  { lat: 35.68, lng: 139.69, city: '도쿄', country: '일본', cc: 'JP' },
  { lat: 13.75, lng: 100.5, city: '방콕', country: '태국', cc: 'TH' },
  { lat: 16.05, lng: 108.2, city: '다낭', country: '베트남', cc: 'VN' },
  { lat: 33.59, lng: 130.4, city: '후쿠오카', country: '일본', cc: 'JP' },
];

function findPlace(lat, lng) {
  const nearest = CITIES.reduce((best, city) =>
    calcDistanceKm({ lat, lng }, city) < calcDistanceKm({ lat, lng }, best) ? city : best,
  );
  const { city, country, cc } = nearest;
  return { city, country, cc };
}

describe('집을 지정한 계정의 Journey를 쓰는 계산', () => {
  const { photos, corrections } = pinnedHome;
  const withoutHome = corrections.filter((correction) => correction.type !== 'home');
  let pinned;
  let auto;

  beforeAll(async () => {
    pinned = await buildJourney(photos, corrections, findPlace);
    auto = await buildJourney(photos, withoutHome, findPlace);
  });

  test('03 합계의 km · flights가 끼운 구간까지 포함해요', () => {
    // when
    const totals = selectJourneyTotals(pinned);

    // then
    expect(pinned.legs).toHaveLength(6);
    expect(totals.km).toBe(pinned.legs.reduce((sum, leg) => sum + leg.km, 0));
    expect(totals.flights).toBe(pinned.legs.filter((leg) => leg.mode === 'flight').length);
    expect(totals.flights).toBe(6);
    // 직행 구간 둘이 집을 거치는 구간으로 바뀌어 자동 판단보다 멀어요.
    expect(totals.km).toBeGreaterThan(selectJourneyTotals(auto).km);
  });

  test('05 외출: 집을 끼운 경계는 별도 외출이고, 시간이 부족한 경계는 외출 하나예요', () => {
    // when
    const outings = groupOutings(pinned).map((visits) => visits.map(({ stop }) => stop.id));
    const autoOutings = groupOutings(auto).map((visits) => visits.map(({ stop }) => stop.id));

    // then
    expect(outings).toEqual([['p_t1'], ['p_b1', 'p_d1'], ['p_f1']]);
    // 자동으로 잡힌 집이면 도쿄 → 방콕도 집에 안 들른 한 번의 외출이에요.
    expect(autoOutings).toEqual([['p_t1', 'p_b1', 'p_d1'], ['p_f1']]);
  });

  test('05 입국 스탬프는 외출마다 나라별 첫 입국이에요', () => {
    // when
    const stamps = selectPassportStamps(pinned);

    // then: 시간이 부족한 경계의 다낭은 방콕과 같은 외출이라 다낭 스탬프의 여행이 다낭 여행이에요
    expect(stamps.map(({ cc, tripId }) => [cc, tripId])).toEqual([
      ['JP', 'p_t1'],
      ['TH', 'p_b1'],
      ['VN', 'p_d1'],
    ]);
  });

  test('05 캘린더: 끼운 경계 사이 날은 집에 있던 날이고, gap으로 남은 경계는 밖이에요', () => {
    // given
    const kindOf = (calendar, date) =>
      calendar.weeks.flatMap((week) => week.days).find((day) => day.date === date)?.kind;

    // when
    const calendar = selectPassportCalendar(pinned, '2024-04-01');
    const autoCalendar = selectPassportCalendar(auto, '2024-04-01');

    // then: 도쿄(1/12)와 방콕(2/10) 사이
    expect(kindOf(calendar, '2024-01-25')).toBe('home');
    expect(kindOf(autoCalendar, '2024-01-25')).toBe('trip');
    // 방콕 → 다낭 gap은 같은 날이라 그날은 밖이에요.
    expect(kindOf(calendar, '2024-02-12')).toBe('trip');
    expect(calendar.tripDays).toBeLessThan(autoCalendar.tripDays);
  });

  test('05 통계: 밖에서 잔 밤은 여행의 밤과 gap 구간의 밤만 세요', () => {
    // when
    const stats = selectPassportStats(pinned);
    const autoStats = selectPassportStats(auto);

    // then: 도쿄 2 + 방콕 2 + 다낭 0 + 후쿠오카 1. 방콕 → 다낭 gap은 같은 날이라 0이에요.
    expect(stats.nightsAway).toBe(5);
    // 자동 판단은 도쿄 → 방콕 gap의 29일이 더해져요.
    expect(autoStats.nightsAway).toBe(34);
    expect(stats.km).toBe(selectJourneyTotals(pinned).km);
    expect(stats.flights).toBe(6);
  });

  test('05 기록: 집을 끼워도 가장 많이 간 나라와 집에서 가장 먼 지점이 맞아요', () => {
    // when
    const records = selectPassportRecords(pinned);

    // then
    expect(records.mostVisited).toMatchObject({ cc: 'JP', visits: 2 });
    expect(records.farthest).toMatchObject({ homeCity: '서울' });
    expect(records.farthest.stop.id).toBe('p_b1');
  });

  test('01 끼운 집에서 나가는 구간은 이동 수단을 고칠 수 없고, 실제 집에서 나가는 구간은 고칠 수 있어요', () => {
    // when
    const editable = pinned.legs.map(canEditLegMode);

    // then: outbound(도쿄) outbound(방콕) 끼운 집 → false, 후쿠오카 실제 집 → true
    expect(editable).toEqual([false, true, false, true, true, true]);
  });

  test('01 맨 앞에 집을 끼우면 처음에 머무는 구간이 없어요', async () => {
    // given: 도쿄 → 후쿠오카 여행 뒤에 서울 집 사진이 있는 계정이에요. 지정하지 않으면 첫 구간이 도쿄에서 떠나요
    const account = photos
      .filter((photo) => ['p_t1', 'p_f1', 'p_s1', 'p_s2', 'p_s3'].includes(photo.id))
      .map((photo) => (photo.id === 'p_f1' ? { ...photo, takenAt: '2024-01-11T10:00:00' } : photo));
    const home = { id: 'h', type: 'home', photoIds: ['p_s1'] };

    // when
    const unpinned = await buildJourney(account, [], findPlace);
    const withHome = await buildJourney(account, [home], findPlace);

    // then
    expect(hasLeadingStay(unpinned.legs)).toBe(true);
    expect(withHome.legs[0]).toMatchObject({ kind: 'outbound', from: 'home' });
    expect(hasLeadingStay(withHome.legs)).toBe(false);
  });
});
