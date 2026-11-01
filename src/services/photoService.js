import { getSupabse } from './getSupabase';

/**
 * 로그인한 사람의 데이터(사진·보정·글)를 한 번에 가져와요.
 * buildJourney가 사진과 보정을 같이 쓰니, 따로 부르지 말고 이걸 한 번 받아서 나눠 써요.
 * 로그인하지 않았으면 Supabase가 거절해서 오류를 던져요.
 *
 * @returns {Promise<import('@/types').MyData>}
 */
export async function getMyData() {
  const supabase = await getSupabse();
  const { data, error } = await supabase.rpc('my_data');
  if (error) throw error;
  return data;
}

/**
 * 사진 정보를 저장해요. 이미 올린 사진(같은 파일 이름, 촬영 시각)을 건너뛰어요
 * ownerId, uploadedAt, timeUncertain은 서버가 정해서 넘기지 않습니다.
 * @param {Omit<import('@/types').Photo, 'ownerId' | 'uploadedAt' | 'timeUncertain'>[]} photos
 * @returns {Promise<import('@/types').SavePhotosResult>}
 */
export async function savePhotos(photos) {
  if (photos.length === 0)
    return {
      saved: [],
      skipped: [],
    };

  const supabase = await getSupabse();
  const { data, error } = await supabase.rpc('save_photos', {
    photos,
  });
  if (error) throw error;

  // save_photos는 새로 넣은 ID만 돌려줘서, 넘긴 ID중 거기 없는 것이 건너뛴 사진입니다.
  const savedIds = new Set(data);
  const ids = photos.map((photo) => photo.id);

  return {
    saved: ids.filter((id) => savedIds.has(id)),
    skipped: ids.filter((id) => !savedIds.has(id)),
  };
}

/**
 * 사진을 지워요. 없는 사진이나 남의 사진은 오류 없이 빠지니, 돌려받은 ID로 확인해요.
 *
 * @param {string[]} ids
 * @returns {Promise<string[]>} 실제로 지운 사진 ID
 */
export async function deletePhotos(ids) {
  if (ids.length === 0) return [];

  const supabase = await getSupabse();

  // RLS에 막히면 오류 대신 0행이 지워져서, select로 지운 행을 돌려받아 확인합니다.
  const { data, error } = await supabase.from('photos').delete().in('id', ids).select('id');
  if (error) throw error;

  return data.map((row) => row.id);
}
