import { describe, expect, test } from 'vitest';
import { collectMergeSpans, crossesMergeBoundary } from '@/utils/journey/mergeSpans';

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
