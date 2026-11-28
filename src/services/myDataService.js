import { getSupabase } from './getSupabase';
import { beginDeleteAll, deleteJourney } from './journeyService';
import { clearMyPhotos } from './myPhotosService';
import { deleteAllUploadedImages } from './photoService';

// 사진을 가리키는 글 · 보정부터 지워요. 사진을 먼저 지우면 연결 칸(post_photos 등)만 사라지고 빈 글 · 보정이 남아요.
const OWNED_TABLES = ['posts', 'corrections', 'photos'];

/**
 * 내 사진과 그 사진으로 만든 것을 모두 지워요(#284). 지우고 나면 가입한 직후처럼 비어요.
 * Journey → 글 · 보정 · 사진 행 → photos 버킷의 내 이미지 순서예요.
 * 행이 0개여도 오류가 아니에요. 이미 비었거나, 앞서 중간까지 지운 계정이에요.
 *
 * 중간에 실패하면 던져요. 그 앞까지 지운 것은 그대로라, 다시 부르면 남은 것만 지워요.
 * Journey를 먼저 지우는 이유: 사진 행을 다 지운 뒤 실패하고 새로고침하면 사진이 0장이라 07에 버튼이 없어요.
 * 그때 Journey가 남아 있으면 01 · 03에 사진 없는 여행이 남고 지울 방법이 없어요. 사진 행이 남아 있는 동안은
 * 버튼이 보여서 다시 누를 수 있어요.
 * 지우는 동안 beginDeleteAll로 알려서, 그 사이에 걸친 Journey 계산이 옛 Journey를 다시 저장하지 않게 해요.
 * 이미지를 지우지 못하면 던지지 않아요(deletePhotos와 같아요). 행이 이미 지워져 버튼이 사라지고, 남은 파일은
 * 어느 화면도 가리키지 않아서예요.
 * 지운 뒤 사진 목록 기억을 비워서 열린 화면이 빈 목록을 읽어요. 보정 · 글 스토어는 부르는 쪽이 비워요.
 *
 * @param {string} ownerId 로그인한 사람의 id(AuthUser.id)
 * @returns {Promise<void>}
 */
export async function deleteAllMyData(ownerId) {
  const endDelete = beginDeleteAll(ownerId);
  try {
    await deleteJourney(ownerId);

    const supabase = await getSupabase();
    for (const table of OWNED_TABLES) {
      const { error } = await supabase.from(table).delete().eq('owner_id', ownerId);
      if (error) throw error;
    }
    clearMyPhotos();

    try {
      await deleteAllUploadedImages(ownerId);
    } catch (error) {
      console.error(error);
    }
  } finally {
    endDelete();
  }
}
