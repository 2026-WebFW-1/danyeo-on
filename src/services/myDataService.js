import { getSupabase } from './getSupabase';
import { deleteJourney } from './journeyService';
import { clearMyPhotos } from './myPhotosService';
import { deleteAllUploadedImages } from './photoService';

// 사진을 가리키는 글 · 보정부터 지워요. 사진을 먼저 지우면 연결 칸(post_photos 등)만 사라지고 빈 글 · 보정이 남아요.
const OWNED_TABLES = ['posts', 'corrections', 'photos'];

/**
 * 내 사진과 그 사진으로 만든 것을 모두 지워요(#284). 지우고 나면 가입한 직후처럼 비어요.
 * 글 · 보정 · 사진 행 → photos 버킷의 내 이미지 → Journey 순서예요.
 * 행이 0개여도 오류가 아니에요. 이미 비었거나, 앞서 중간까지 지운 계정이에요.
 *
 * 중간에 실패하면 던져요. 그 앞까지 지운 것은 그대로라, 다시 부르면 남은 것만 지워요.
 * 지운 뒤 사진 목록 기억을 비워서 열린 화면이 빈 목록을 읽어요. 보정 · 글 스토어는 부르는 쪽이 비워요.
 *
 * @param {string} ownerId 로그인한 사람의 id(AuthUser.id)
 * @returns {Promise<void>}
 */
export async function deleteAllMyData(ownerId) {
  const supabase = await getSupabase();
  for (const table of OWNED_TABLES) {
    const { error } = await supabase.from(table).delete().eq('owner_id', ownerId);
    if (error) throw error;
  }

  await deleteAllUploadedImages(ownerId);
  await deleteJourney(ownerId);
  clearMyPhotos();
}
