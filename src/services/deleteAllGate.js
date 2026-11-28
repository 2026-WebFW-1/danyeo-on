// 사진을 모두 지우는 중인지(#284) 이 탭의 쓰기 서비스가 같이 봐요.
// 한 탭에는 한 계정만 로그인해서 계정별로 나누지 않아요.
let deletingCount = 0;
// 지우기를 시작할 때와 끝날 때 올려요. Journey 계산이 그 사이에 걸쳤는지 볼 때 써요.
let epoch = 0;

/**
 * 사진을 모두 지우기 시작한다고 알려요. 돌려준 함수로 끝났다고 알려요(성공 · 실패 모두).
 * 그동안 쓰기 서비스는 요청을 보내지 않고 거절해요(assertNotDeletingAll). 입구가 07 · 13 · 글 쓰기 등
 * 화면마다 흩어져 있어서, 화면마다 막지 않고 모든 쓰기가 지나는 서비스에서 막아요.
 * 이미 서버로 출발한 요청은 막지 못해요. 다른 탭 · 기기의 쓰기도 막지 못해요.
 *
 * @returns {() => void} 끝났다고 알리는 함수. 두 번 불러도 한 번만 반영해요
 */
export function beginDeleteAll() {
  epoch += 1;
  deletingCount += 1;
  let isEnded = false;
  return () => {
    if (isEnded) return;
    isEnded = true;
    epoch += 1;
    deletingCount -= 1;
  };
}

/** @returns {boolean} 지금 사진을 모두 지우는 중인지 */
export function isDeletingAll() {
  return deletingCount > 0;
}

/** @returns {number} 지우기를 시작하거나 끝낼 때마다 오르는 번호. 계산 전후로 비교해 그 사이에 지웠는지 봐요 */
export function getDeleteAllEpoch() {
  return epoch;
}

/**
 * 사진을 모두 지우는 중이면 { status: 0, code: 'DELETING_ALL', message }로 던져요.
 * 쓰기 서비스가 요청을 보내기 전에 불러요.
 */
export function assertNotDeletingAll() {
  if (isDeletingAll()) {
    throw { status: 0, code: 'DELETING_ALL', message: '사진을 모두 지우는 중이에요' };
  }
}
