import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { getNextStop } from '@/utils/chapters';
import { getContinueTarget, getStopPath } from '@/utils/stopPath';

const findStop = (journey, city) => journey.stops.find((stop) => stop.city === city);

describe('getStopPath', () => {
  test('챕터 지점은 02 챕터 주소예요', () => {
    expect(getStopPath(findStop(seojin, '밴쿠버'))).toBe('/chapter/밴쿠버-2025');
  });

  test('챕터가 아닌 지점은 03에서 그 여행의 탭이에요', () => {
    const banff = findStop(seojin, '밴프');

    expect(getStopPath(banff)).toBe(`/places?trip=${banff.tripId}`);
  });

  test('경유 지점은 챕터 표시가 있어도 03으로 보내요', () => {
    const stop = { chapter: true, slug: '경유-2025', transit: true, tripId: 'p_1' };

    expect(getStopPath(stop)).toBe('/places?trip=p_1');
  });

  test('slug가 없으면 03으로 보내요', () => {
    expect(getStopPath({ chapter: true, slug: null, transit: false, tripId: 'p_1' })).toBe(
      '/places?trip=p_1',
    );
  });

  test('여행 id의 특수문자는 주소에 맞게 바꿔요', () => {
    const stop = { chapter: false, slug: null, transit: false, tripId: 'p a&b' };

    expect(getStopPath(stop)).toBe('/places?trip=p%20a%26b');
  });
});

describe('getContinueTarget', () => {
  test('다음 지점이 챕터가 아니면 03의 그 여행 탭으로 가요', () => {
    const vancouver = findStop(seojin, '밴쿠버');
    const banff = getNextStop(seojin, vancouver.id);

    expect(getContinueTarget(vancouver, banff)).toEqual({
      path: `/places?trip=${banff.tripId}`,
      label: '계속 여행하기',
      nextName: '밴프',
    });
  });

  test('다음 지점이 챕터면 그 챕터로 가요', () => {
    const stop = { tripId: 'p_1' };
    const next = {
      chapter: true,
      slug: '토론토-2025',
      transit: false,
      tripId: 'p_1',
      city: '토론토',
    };

    expect(getContinueTarget(stop, next)).toEqual({
      path: '/chapter/토론토-2025',
      label: '계속 여행하기',
      nextName: '토론토',
    });
  });

  test('여행의 마지막 지점이면 03에서 이 여행의 탭을 여는 전체 기록 보기예요', () => {
    const london = findStop(edge, '런던');

    expect(getNextStop(edge, london.id)).toBeNull();
    expect(getContinueTarget(london, null)).toEqual({
      path: `/places?trip=${london.tripId}`,
      label: '전체 기록 보기',
      nextName: null,
    });
  });
});
