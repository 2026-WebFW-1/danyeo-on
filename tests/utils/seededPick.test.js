import { describe, expect, test } from 'vitest';

import { createSeed, pickBySeed, sortBySeed } from '@/utils/seededPick';

const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
const keyOf = (item) => item.id;
const ids = (list) => list.map((item) => item.id);
const seedsFrom = (count) => Array.from({ length: count }, (_, index) => index + 1);

describe('createSeed', () => {
  test('0 이상 2^32 미만의 정수를 줘요', () => {
    for (let count = 0; count < 50; count += 1) {
      const seed = createSeed();

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });

  test('부를 때마다 다른 값이 나와요', () => {
    const seeds = new Set(Array.from({ length: 20 }, () => createSeed()));

    expect(seeds.size).toBeGreaterThan(1);
  });
});

describe('sortBySeed', () => {
  test('같은 시드면 항상 같은 순서예요', () => {
    expect(ids(sortBySeed(items, 7, keyOf))).toEqual(ids(sortBySeed(items, 7, keyOf)));
  });

  test('항목이 모두 들어 있고 원래 배열은 바뀌지 않아요', () => {
    const before = ids(items);

    const sorted = sortBySeed(items, 7, keyOf);

    expect(ids(sorted).toSorted()).toEqual(before);
    expect(ids(items)).toEqual(before);
  });

  test('들어온 순서와 상관없이 같은 결과예요', () => {
    expect(ids(sortBySeed(items.toReversed(), 7, keyOf))).toEqual(ids(sortBySeed(items, 7, keyOf)));
  });

  test('시드가 다르면 순서가 달라져요', () => {
    const orders = new Set(seedsFrom(20).map((seed) => ids(sortBySeed(items, seed, keyOf)).join()));

    expect(orders.size).toBeGreaterThan(10);
  });

  test('항목을 하나 빼도 나머지끼리의 순서는 그대로예요', () => {
    seedsFrom(20).forEach((seed) => {
      const full = ids(sortBySeed(items, seed, keyOf));
      const withoutC = ids(
        sortBySeed(
          items.filter((item) => item.id !== 'c'),
          seed,
          keyOf,
        ),
      );

      expect(withoutC).toEqual(full.filter((id) => id !== 'c'));
    });
  });

  test('맨 앞자리를 시드마다 고르게 나눠 가져요', () => {
    const four = items.slice(0, 4);
    const firstCounts = Object.fromEntries(four.map((item) => [item.id, 0]));

    seedsFrom(400).forEach((seed) => {
      firstCounts[sortBySeed(four, seed, keyOf)[0].id] += 1;
    });

    // 400번에 넷이라 이론상 100번씩이에요
    Object.values(firstCounts).forEach((count) => {
      expect(count).toBeGreaterThan(60);
      expect(count).toBeLessThan(140);
    });
  });

  test('항목이 없으면 빈 배열이에요', () => {
    expect(sortBySeed([], 7, keyOf)).toEqual([]);
  });
});

describe('pickBySeed', () => {
  test('count개를 골라요', () => {
    expect(pickBySeed(items, 4, 7, keyOf)).toHaveLength(4);
  });

  test('고른 것은 섞은 순서의 앞부분이에요', () => {
    expect(ids(pickBySeed(items, 3, 7, keyOf))).toEqual(
      ids(sortBySeed(items, 7, keyOf)).slice(0, 3),
    );
  });

  test('있는 것보다 많이 달라고 하면 있는 만큼만 줘요', () => {
    expect(pickBySeed(items, 10, 7, keyOf)).toHaveLength(6);
  });

  test('0개를 달라고 하거나 항목이 없으면 빈 배열이에요', () => {
    expect(pickBySeed(items, 0, 7, keyOf)).toEqual([]);
    expect(pickBySeed([], 3, 7, keyOf)).toEqual([]);
  });

  test('글자 항목도 골라요(스티커 글자처럼 key가 자기 자신이에요)', () => {
    const labels = ['밴쿠버', '개스타운', '산책', '카페', '야경'];

    const picked = pickBySeed(labels, 3, 7, (label) => label);

    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    expect(picked.every((label) => labels.includes(label))).toBe(true);
  });
});
