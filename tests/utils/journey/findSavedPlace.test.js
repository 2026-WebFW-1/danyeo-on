import { describe, expect, test } from 'vitest';

import { UNKNOWN_PLACE } from '@/constants/geocode';
import { findSavedPlace } from '@/utils/journey/findSavedPlace';

// 위도 0.005도는 약 550m, 0.02도는 약 2.2km예요.
const NEAR = 0.005;
const FAR = 0.02;

const VANCOUVER = { lat: 49.30877, lng: -123.11272 };
const BANFF = { lat: 51.3057, lng: -115.99327 };
const HOME = { lat: 37.55789, lng: 126.92071 };

const SEED_VANCOUVER = { city: '밴쿠버', country: '캐나다', cc: 'CA' };

const savedJourneyOf = ({ home = null, stops = [] } = {}) => ({ home, stops });
const stopOf = (id, point, place) => ({ id, ...point, ...place });

describe('findSavedPlace', () => {
  describe('null을 돌려줘요', () => {
    test.each([
      ['못 읽었을 때(null)', null],
      ['비었을 때', savedJourneyOf()],
    ])('저장된 Journey를 %s', (_, savedJourney) => {
      // when
      const savedPlace = findSavedPlace(savedJourney, VANCOUVER.lat, VANCOUVER.lng);

      // then
      expect(savedPlace).toBeNull();
    });

    test('저장된 지점에서 1km 넘게 떨어진 좌표', () => {
      // given
      const savedJourney = savedJourneyOf({ stops: [stopOf('p_van', VANCOUVER, SEED_VANCOUVER)] });

      // when
      const savedPlace = findSavedPlace(savedJourney, VANCOUVER.lat + FAR, VANCOUVER.lng);

      // then
      expect(savedPlace).toBeNull();
    });

    test('저장된 이름이 이름 없는 곳인 좌표(다시 찾게)', () => {
      // given
      const unknownBanff = { ...UNKNOWN_PLACE, country: '캐나다', cc: 'CA' };
      const savedJourney = savedJourneyOf({ stops: [stopOf('p_banff', BANFF, unknownBanff)] });

      // when
      const savedPlace = findSavedPlace(savedJourney, BANFF.lat, BANFF.lng);

      // then
      expect(savedPlace).toBeNull();
    });
  });

  describe('저장된 이름을 돌려줘요', () => {
    test('저장된 지점 1km 안이면 그 지점의 도시·나라', () => {
      // given
      const savedJourney = savedJourneyOf({ stops: [stopOf('p_van', VANCOUVER, SEED_VANCOUVER)] });

      // when
      const savedPlace = findSavedPlace(savedJourney, VANCOUVER.lat + NEAR, VANCOUVER.lng);

      // then
      expect(savedPlace).toEqual(SEED_VANCOUVER);
    });

    test('집 근처면 집 이름', () => {
      // given
      const savedJourney = savedJourneyOf({ home: { ...HOME, city: '서울' } });

      // when
      const savedPlace = findSavedPlace(savedJourney, HOME.lat, HOME.lng);

      // then
      expect(savedPlace.city).toBe('서울');
    });
  });

  describe('돌려주는 값', () => {
    test('돌려받은 장소를 고쳐도 저장된 Journey는 그대로예요', () => {
      // given
      const savedJourney = savedJourneyOf({ stops: [stopOf('p_van', VANCOUVER, SEED_VANCOUVER)] });

      // when
      const savedPlace = findSavedPlace(savedJourney, VANCOUVER.lat, VANCOUVER.lng);
      savedPlace.city = '고침';

      // then
      expect(savedJourney.stops[0].city).toBe('밴쿠버');
    });
  });
});
