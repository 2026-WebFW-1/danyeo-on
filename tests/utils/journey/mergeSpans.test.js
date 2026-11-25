import { describe, expect, test } from 'vitest';
import { crossesMergeBoundary } from '@/utils/journey/group';
import { collectMergeSpans } from '@/utils/journey/mergeSpans';

describe('합칠 구간의 두 시각', () => {
  const photo = (id, takenAt, offset) => Object.freeze({ id, takenAt, offset });
  const photos = [
    photo('a', '2026-01-01T10:00:00'),
    photo('b', '2026-01-01T09:00:00', '+07:00'),
    photo('same', '2026-01-01T08:00:00', '+07:00'),
    photo('invalid', 'invalid'),
    photo('empty', null),
  ];
  const byId = new Map(photos.map((p) => [p.id, p]));
  const span = Object.freeze({
    id: 'm',
    photoIds: ['a', 'b'],
    startAt: Date.UTC(2026, 0, 1, 1),
    endAt: Date.UTC(2026, 0, 1, 2),
  });

  test('현지 시각 순서가 반대여도 시간대를 적용한 실제 시각으로 구간을 만들어요', () => {
    // given
    const corrections = Object.freeze([
      Object.freeze({ id: 'm', type: 'merge', photoIds: Object.freeze(['a', 'b']) }),
    ]);
    const before = structuredClone(byId);
    // when
    const result = collectMergeSpans(corrections, byId);
    // then
    expect(result).toEqual([span]);
    expect(collectMergeSpans(corrections, byId)).toEqual(result);
    expect(byId).toEqual(before);
  });

  test.each(
    [
      undefined,
      [],
      ['a'],
      ['a', 'b', 'b'],
      ['a', 'missing'],
      ['empty', 'b'],
      ['invalid', 'b'],
      ['a', 'same'],
      ['b', 'a'],
    ].map((ids) => [ids]),
  )('사용할 수 없는 사진 쌍 %j만 건너뛰어요', (ids) => {
    // given
    const corrections = [
      { type: 'merge', id: 'bad', photoIds: ids },
      { type: 'transit', photoIds: ['a', 'b'] },
      { id: 'm', type: 'merge', photoIds: ['a', 'b'] },
    ];
    // when, then
    expect(collectMergeSpans(corrections, byId)).toEqual([span]);
  });

  test.each([
    [null, 15, false],
    [0, 10, false],
    [20, 30, false],
    [10, 20, true],
    [5, 15, true],
    [15, 25, true],
  ])('앞 시각 %s와 뒤 시각 %s 사이를 잇는지 판정해요', (left, right, expected) => {
    // when, then
    expect(crossesMergeBoundary({ startAt: 10, endAt: 20 }, left, right)).toBe(expected);
  });
});

describe('집을 지정한 계정에서 기준 사진이 제외된 합치기', () => {
  const place = {
    seoul: { lat: 37.5, lng: 127 },
    bangkok: { lat: 13.75, lng: 100.5 },
    danang: { lat: 16.05, lng: 108.2 },
  };
  const photo = (id, takenAt, where) => ({ id, takenAt, offset: '+09:00', ...place[where] });
  const photos = [
    photo('s1', '2024-07-01T09:00:00', 'seoul'),
    photo('s2', '2024-07-02T09:00:00', 'seoul'),
    photo('s3', '2024-07-03T09:00:00', 'seoul'),
    photo('s4', '2024-07-04T09:00:00', 'seoul'),
    photo('b1', '2024-07-11T09:00:00', 'bangkok'),
    photo('b2', '2024-07-13T09:00:00', 'bangkok'),
    photo('d1', '2024-08-01T09:00:00', 'danang'),
  ];
  const byId = new Map(photos.map((p) => [p.id, p]));
  const merge = {
    id: 'm',
    type: 'merge',
    photoIds: ['b2', 'd1'],
    createdAt: '2025-01-01T00:00:00Z',
  };

  test('합칠 당시 집이던 지역의 사진은 여행에 없어서 대체 기준으로 쓰지 않아요', () => {
    // given: b1을 집으로 지정한 뒤 합쳤고, b2를 제외했어요
    const corrections = [{ id: 'h', type: 'home', photoIds: ['b1'] }, merge];
    const excluded = new Set(['b2']);

    // when
    const result = collectMergeSpans(corrections, byId, excluded);

    // then
    expect(result).toEqual([]);
  });

  test('home 보정이 없으면 같은 여행의 b1이 대체 기준이에요', () => {
    // when
    const result = collectMergeSpans([merge], byId, new Set(['b2']));

    // then
    expect(result.map((span) => span.photoIds)).toEqual([['b1', 'd1']]);
  });
});
