// 사진을 모두 지우는 중인지(#284) 이 탭의 쓰기 서비스가 같이 봐요.
// 한 탭에는 한 계정만 로그인해서 계정별로 나누지 않아요.
let deletingCount = 0;
// 지우기를 시작할 때와 끝날 때 올려요. Journey 계산이 그 사이에 걸쳤는지 볼 때 써요.
let epoch = 0;
// 지금 서버로 보내는 중인 쓰기예요. 지우기는 이게 다 끝난 뒤에 시작해요.
const writesInFlight = new Set();

/**
 * 서버에 쓰는 서비스 함수를 감싸요. 쓰기 서비스를 새로 만들면 이걸로 감싸 주세요.
 *  - 사진을 모두 지우는 중이면 요청을 보내지 않고 { status: 0, code: 'DELETING_ALL', message }로 거절해요.
 *  - 보내는 중인 쓰기로 세어서, 지우기가 이 쓰기가 끝날 때까지 기다리게 해요.
 * 입구가 07 · 13 · 글 쓰기 등 화면마다 흩어져 있어서, 화면마다 막지 않고 모든 쓰기가 지나는 여기서 막아요.
 *
 * export const savePost = guardWrite(async (post) => { ... });
 *
 * @template {unknown[]} A
 * @template T
 * @param {(...args: A) => Promise<T>} write
 * @returns {(...args: A) => Promise<T>}
 */
export function guardWrite(write) {
  return async (...args) => {
    assertNotDeletingAll();
    const writing = write(...args);
    writesInFlight.add(writing);
    try {
      return await writing;
    } finally {
      writesInFlight.delete(writing);
    }
  };
}

/**
 * 사진을 모두 지우기 시작한다고 알리고, 이미 보내는 중인 쓰기가 끝날 때까지 기다려요.
 * 돌려준 함수로 끝났다고 알려요(성공 · 실패 모두). 그동안 새 쓰기는 guardWrite가 거절해요.
 * 다른 탭 · 기기의 쓰기는 막지 못해요.
 *
 * @returns {Promise<() => void>} 끝났다고 알리는 함수. 두 번 불러도 한 번만 반영해요
 */
export async function beginDeleteAll() {
  epoch += 1;
  deletingCount += 1;
  let isEnded = false;
  const endDelete = () => {
    if (isEnded) return;
    isEnded = true;
    epoch += 1;
    deletingCount -= 1;
  };
  // 실패한 쓰기도 끝난 것이라 결과는 보지 않아요.
  await Promise.allSettled([...writesInFlight]);
  return endDelete;
}

/** @returns {boolean} 지금 사진을 모두 지우는 중인지 */
export function isDeletingAll() {
  return deletingCount > 0;
}

/** @returns {number} 지우기를 시작하거나 끝낼 때마다 오르는 번호. 계산 전후로 비교해 그 사이에 지웠는지 봐요 */
export function getDeleteAllEpoch() {
  return epoch;
}

/** 사진을 모두 지우는 중이면 { status: 0, code: 'DELETING_ALL', message }로 던져요. */
export function assertNotDeletingAll() {
  if (isDeletingAll()) {
    throw { status: 0, code: 'DELETING_ALL', message: '사진을 모두 지우는 중이에요' };
  }
}
