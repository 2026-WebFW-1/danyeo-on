// 시드(처음 정한 숫자)로 하는 "무작위"예요. 시드와 항목의 key만으로 순서가 정해져서, 같은 시드면 몇 번을 다시 그려도 같은 것이
// 뽑혀요. 시드는 화면에 들어올 때 한 번 새로 만들어서(createSeed), 들어올 때마다 다르게 뽑혀요.

const SEED_RANGE = 2 ** 32;

/**
 * 새 시드를 만들어요. 화면에 들어올 때 한 번만 불러서 상태로 들고 있어요.
 *
 * @returns {number} 0 이상 2^32 미만의 정수
 */
export function createSeed() {
  return Math.floor(Math.random() * SEED_RANGE);
}

// 글자를 섞어 32비트 정수로 만들어요. FNV-1a에 마무리 섞기를 더해서, 끝글자만 다른 id끼리도 순서가 고르게 흩어져요.
function hashText(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * items를 시드로 섞은 새 배열을 줘요(원래 배열은 그대로예요).
 * 순서는 시드와 각 항목의 key로만 정해져요. 같은 시드면 항상 같은 순서이고, 들어온 순서와도 상관없어요.
 * 항목이 늘거나 줄어도 나머지끼리의 순서는 그대로라서, 글을 고쳐 저장해도 콜라주가 통째로 바뀌지 않아요.
 *
 * @template T
 * @param {T[]} items
 * @param {number} seed
 * @param {(item: T) => string} getKey 항목마다 다른 글자(id 등)를 줘요
 * @returns {T[]}
 */
export function sortBySeed(items, seed, getKey) {
  return items
    .map((item) => ({ item, rank: hashText(`${seed}:${getKey(item)}`) }))
    .toSorted((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

/**
 * items에서 count개를 시드로 골라요. count보다 적게 있으면 있는 만큼 줘요.
 *
 * @template T
 * @param {T[]} items
 * @param {number} count
 * @param {number} seed
 * @param {(item: T) => string} getKey
 * @returns {T[]}
 */
export function pickBySeed(items, count, seed, getKey) {
  return sortBySeed(items, seed, getKey).slice(0, count);
}
