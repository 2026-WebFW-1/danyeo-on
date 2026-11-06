import { getSupabase } from './getSupabase';

// 한 번에 묻는 사진 id 수예요. id를 모두 주소에 실어 보내서, 수백 개를 한 번에 보내면 주소가 너무 길어져요.
const REQUEST_CHUNK_SIZE = 100;

/**
 * 사진별 글(photo_notes)에서 본문을 읽어요. 사진 id가 없으면 요청하지 않아요.
 * 로그인한 사람의 사진 글만 읽혀요(RLS가 사진 주인에게만 허락해요). 글이 없는 사진은 결과에 없어요.
 * 100개씩 나눠 묻고 합쳐요. 하나라도 실패하면 Supabase의 error를 그대로 던져요(어떻게 보일지는 부른 쪽이 정해요).
 *
 * @param {string[]} photoIds
 * @returns {Promise<{ photoId: string, body: string }[]>}
 */
export async function getPhotoNotes(photoIds) {
  if (photoIds.length === 0) return [];

  const supabase = await getSupabase();
  const chunks = Array.from(
    { length: Math.ceil(photoIds.length / REQUEST_CHUNK_SIZE) },
    (_, index) => photoIds.slice(index * REQUEST_CHUNK_SIZE, (index + 1) * REQUEST_CHUNK_SIZE),
  );

  const results = await Promise.all(
    chunks.map(async (ids) => {
      const { data, error } = await supabase
        .from('photo_notes')
        .select('photoId:photo_id, body')
        .in('photo_id', ids);
      if (error) throw error;
      return data;
    }),
  );
  return results.flat();
}
