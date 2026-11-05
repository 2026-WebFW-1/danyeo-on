import { getMyData } from './photoService';

// 계정마다 한 번만 읽어요. 03·02·14a가 같은 사진 목록을 받고, 화면을 오가도 다시 읽지 않아요.
// getMyData 자체에는 기억을 두지 않아요. 글을 읽는 getPosts도 getMyData를 불러서, 거기에 두면 저장하기 전의 옛 글을 받을 수 있어요.
const cache = new Map();

/**
 * 로그인한 사람의 사진 전부를 읽어요. 같은 계정은 처음 한 번만 읽고 모두 같은 배열을 받아요.
 * 실패하면 { status, code, message }로 거절하고 기억을 지워서 다음에 다시 읽어요.
 * 읽는 사이에 계정이 바뀌어 다른 사람의 사진이 왔으면 그 결과는 버리고 기억도 지워요.
 *
 * @param {string} userId 로그인한 사람의 id(AuthUser.id). 기억을 계정별로 나누는 열쇠예요
 * @returns {Promise<import('@/types').Photo[]>}
 */
export function getMyPhotos(userId) {
  if (!cache.has(userId)) {
    const request = getMyData().then(
      ({ photos }) => {
        if (photos.some((photo) => photo.ownerId !== userId)) {
          throw { status: 0, code: 'ACCOUNT_CHANGED', message: '읽는 사이에 계정이 바뀌었어요' };
        }
        return photos;
      },
      (error) => {
        throw { status: 0, code: 'LOAD_FAILED', message: error.message };
      },
    );
    // 실패한 요청은 기억하지 않아요. 같은 요청이 그 사이에 지워졌다면 새로 쓴 기억을 지우지 않게 확인해요.
    request.catch(() => {
      if (cache.get(userId) === request) cache.delete(userId);
    });
    cache.set(userId, request);
  }
  return cache.get(userId);
}

/**
 * 읽어 둔 사진을 모두 비워요. 새 사진을 저장한 뒤에는 다음에 다시 읽어야 새 사진이 보여요.
 * 저장 흐름이 부르는 자리는 아직 정해지지 않았어요(#27에서 A와 정해요).
 */
export function clearMyPhotos() {
  cache.clear();
}
