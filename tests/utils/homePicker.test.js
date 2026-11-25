import { describe, expect, test } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import {
  canSetHome,
  getHomeGuide,
  HOME_GUIDE_EMPTY,
  selectHomeCandidates,
} from '@/utils/homePicker';

const photo = (id, lat, lng, fileKey = null) => ({ id, lat, lng, fileKey });
// 부산 집(35.18, 129.07) 근처와 먼 곳이에요.
const nearBusan = (id, fileKey) => photo(id, 35.2, 129.1, fileKey);
const farAway = (id) => photo(id, 13.75, 100.5);
const withoutHomeLegs = (journey) => ({
  ...journey,
  legs: journey.legs.filter((leg) => leg.from !== 'home'),
});

describe('selectHomeCandidates', () => {
  test('지금 집이 맨 위이고, 나머지는 사진이 많은 순이에요', () => {
    const candidates = selectHomeCandidates(edge);

    expect(candidates[0]).toMatchObject({ city: '부산', country: '한국', isCurrent: true });
    const counts = candidates.slice(1).map((candidate) => candidate.photoCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(candidates.slice(1).every((candidate) => !candidate.isCurrent)).toBe(true);
  });

  test('같은 도시의 지점들은 한 줄로 묶고 사진 수를 더해요', () => {
    const toronto = selectHomeCandidates(edge).filter((candidate) => candidate.city === '토론토');

    expect(toronto).toHaveLength(1);
    expect(toronto[0]).toMatchObject({ key: 'CA/토론토', photoCount: 3, photoId: 'p_d3b7fd' });
    // 대표 사진은 사진이 가장 많은 지점의 것이에요.
    expect(toronto[0].coverFileKey).toBe('public:/photos/toronto-3.webp');
  });

  test('이름이 같아도 나라가 다르면 다른 줄이에요', () => {
    const journey = {
      ...seojin,
      stops: [
        { ...seojin.stops[0], cc: 'US', city: '포틀랜드', transit: false },
        { ...seojin.stops[1], cc: 'AU', city: '포틀랜드', transit: false },
      ],
    };

    const keys = selectHomeCandidates(journey).map((candidate) => candidate.key);

    expect(keys).toEqual(expect.arrayContaining(['US/포틀랜드', 'AU/포틀랜드']));
  });

  test('경유 지점은 빼요', () => {
    const cities = selectHomeCandidates(edge).map((candidate) => candidate.city);

    expect(cities).not.toContain('도하');
  });

  test('여행 지점의 저장할 사진은 그 도시 첫 지점의 첫 사진이에요', () => {
    const tokyo = selectHomeCandidates(edge).find((candidate) => candidate.city === '도쿄');

    expect(tokyo.photoId).toBe('p_3ec040');
  });

  test('지금 집의 사진은 집에서 나가는 구간의 fromPhotoId에서 찾아요', () => {
    const [current] = selectHomeCandidates(edge);

    expect(current.photoId).toBe(edge.legs.find((leg) => leg.from === 'home').fromPhotoId);
    // 내 사진을 아직 못 읽었으면 장수와 대표 사진은 몰라요.
    expect(current.photoCount).toBeNull();
    expect(current.coverFileKey).toBeNull();
  });

  test('집에서 나가는 구간이 없으면 내 사진 중 집 가까이서 찍은 것을 써요', () => {
    const photos = [farAway('p_far'), nearBusan('p_near', 'public:/near.webp')];

    const [current] = selectHomeCandidates(withoutHomeLegs(edge), photos);

    expect(current).toMatchObject({
      photoId: 'p_near',
      photoCount: 1,
      coverFileKey: 'public:/near.webp',
    });
  });

  test('집 가까이서 찍은 사진이 07에서 빠졌으면 쓰지 않아요', () => {
    const journey = { ...withoutHomeLegs(edge), excluded: ['p_near'] };

    const [current] = selectHomeCandidates(journey, [nearBusan('p_near'), farAway('p_far')]);

    expect(current.photoId).toBeNull();
  });

  test('구간도 집 근처 사진도 없으면 사진 ID가 null이라 고를 수 없어요', () => {
    const [current] = selectHomeCandidates(withoutHomeLegs(edge), [farAway('p_far')]);

    expect(current.photoId).toBeNull();
    expect(canSetHome(current, false)).toBe(false);
  });

  test('집을 모르면 지금 집 없이 여행 도시만 나와요', () => {
    const journey = { ...edge, home: null };

    const candidates = selectHomeCandidates(journey);

    expect(candidates.some((candidate) => candidate.isCurrent)).toBe(false);
    expect(candidates.length).toBeGreaterThan(0);
  });

  test('빈 Journey나 Journey가 없으면 빈 목록이에요', () => {
    expect(selectHomeCandidates(empty)).toEqual([]);
    expect(selectHomeCandidates(null)).toEqual([]);
  });
});

describe('canSetHome', () => {
  const candidate = { photoId: 'p_a', isCurrent: false };

  test('줄을 안 골랐으면 안 돼요', () => {
    expect(canSetHome(null, false)).toBe(false);
  });

  test('여행 지점은 고를 수 있어요', () => {
    expect(canSetHome(candidate, true)).toBe(true);
  });

  test('자동으로 잡힌 지금 집은 직접 지정할 수 있어요', () => {
    expect(canSetHome({ ...candidate, isCurrent: true }, false)).toBe(true);
  });

  test('이미 직접 지정한 지금 집은 바꿀 게 없어요', () => {
    expect(canSetHome({ ...candidate, isCurrent: true }, true)).toBe(false);
  });
});

describe('getHomeGuide', () => {
  test('아무것도 안 골랐을 때의 안내예요', () => {
    expect(getHomeGuide(null, false)).toBe(HOME_GUIDE_EMPTY);
  });

  test('여행 지점을 골랐을 때 집이 되면 기록에서 빠진다고 알려요', () => {
    expect(getHomeGuide({ city: '방콕', isCurrent: false }, false)).toBe(
      '방콕은 집이 되어 여행 기록에서 빠져요. 그곳의 사진과 글은 보이지 않게 되고, 집을 다시 바꾸면 돌아와요.',
    );
    expect(getHomeGuide({ city: '도쿄', isCurrent: false }, true)).toContain('도쿄는 집이 되어');
  });

  test('자동으로 잡힌 지금 집을 골랐을 때 직접 지정한다고 알려요', () => {
    expect(getHomeGuide({ city: '부산', isCurrent: true }, false)).toBe(
      '부산을 집으로 직접 지정해요. 여행 사이에 집에 다녀온 것으로 동선을 그려요.',
    );
  });

  test('이미 직접 지정한 지금 집을 골랐을 때는 처음 안내 그대로예요', () => {
    expect(getHomeGuide({ city: '서울', isCurrent: true }, true)).toBe(HOME_GUIDE_EMPTY);
  });
});
