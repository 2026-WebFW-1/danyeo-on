import { describe, expect, test } from 'vitest';

import { findPinnedHome } from '@/utils/journey/pinnedHome';

describe('집으로 지정한 사진의 좌표', () => {
  const photos = [
    { id: 'a', takenAt: '2026-01-01T10:00:00', lat: 37.5, lng: 127 },
    { id: 'b', takenAt: '2026-01-02T10:00:00', lat: 35.68, lng: 139.69 },
    { id: 'noLocation', takenAt: '2026-01-03T10:00:00', lat: null, lng: null },
  ];
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const home = (id, photoIds) => ({ id, type: 'home', photoIds });

  test('지정한 사진의 좌표를 돌려줘요', () => {
    // given
    const corrections = [home('h', ['a'])];

    // when
    const result = findPinnedHome(corrections, byId);

    // then
    expect(result).toEqual({ photoId: 'a', lat: 37.5, lng: 127 });
  });

  test('home 보정이 없으면 null이에요', () => {
    // given
    const corrections = [{ id: 't', type: 'transit', photoIds: ['a'] }];

    // when, then
    expect(findPinnedHome(corrections, byId)).toBeNull();
    expect(findPinnedHome([], byId)).toBeNull();
  });

  test('home 보정이 여러 개면 마지막 것만 봐요', () => {
    // given
    const corrections = [
      home('h1', ['a']),
      { id: 't', type: 'transit', photoIds: ['a'] },
      home('h2', ['b']),
    ];

    // when, then
    expect(findPinnedHome(corrections, byId)).toEqual({ photoId: 'b', lat: 35.68, lng: 139.69 });
  });

  test.each([
    ['photoIds가 배열이 아니에요', undefined],
    ['photoIds가 비었어요', []],
    ['사진을 못 찾아요', ['missing']],
    ['사진에 위치가 없어요', ['noLocation']],
  ])('마지막 home 보정에서 %s면 앞선 지정으로 돌아가지 않고 null이에요', (_, photoIds) => {
    // given
    const corrections = [home('h1', ['a']), home('h2', photoIds)];

    // when, then
    expect(findPinnedHome(corrections, byId)).toBeNull();
  });
});
