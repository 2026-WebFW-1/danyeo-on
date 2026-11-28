import { guardWrite } from './deleteAllGate';
import { getSupabase } from './getSupabase';
import { getMyData } from './photoService';

function toCorrectionError(error, fallbackCode, status = 0) {
  return { status, code: error.code || fallbackCode, message: error.message };
}

/**
 * 로그인한 사람의 보정을 만든 순서로 가져와요.
 * type마다 칸 이름이 달라서(anchorPhotoId · photoId · photoIds …) 그 모양을 만들어 주는 my_data를 그대로 써요.
 * 실패하면 { status, code, message }로 던져요. getMyData의 오류에는 HTTP 상태가 없어서 status는 0이에요.
 *
 * @returns {Promise<import('@/types').Correction[]>}
 */
export async function getCorrections() {
  try {
    const { corrections } = await getMyData();
    return corrections;
  } catch (error) {
    throw toCorrectionError(error, 'LOAD_FAILED');
  }
}

/**
 * 보정 하나를 저장해요. 보정과 사진 연결(correction_photos)이 같이 들어가서, 한쪽만 남는 일은 없어요.
 * ownerId · createdAt은 서버가 정해서 넘기지 않아요.
 * 서버는 저장된 보정의 id를 돌려줘요. 보통은 보낸 id 그대로예요. 이미 뺀 사진의 exclude면 서버가 넣지 않고
 * 있던 보정의 id를 돌려줘요(다른 탭에서 먼저 뺀 경우. BE #8).
 * 가리키는 사진이 없거나 남의 사진이면 서버가 거절해요.
 * 실패하면 { status, code, message }로 던져요. 서버에 닿지 못하면 status는 0이에요.
 *
 * @param {import('@/types').CorrectionInput & { id: string }} correction
 * @returns {Promise<string>} 저장된 보정의 id
 */
export const addCorrection = guardWrite(async (correction) => {
  let response;
  try {
    const supabase = await getSupabase();
    response = await supabase.rpc('add_correction', { correction });
  } catch (error) {
    throw toCorrectionError(error, 'SAVE_FAILED');
  }
  if (response.error) throw toCorrectionError(response.error, 'SAVE_FAILED', response.status);
  return response.data ?? correction.id;
});

/**
 * 보정 하나를 지워요. 사진 연결은 DB가 같이 지워요(cascade).
 * 실패하면 { status, code, message }로 던져요. 서버에 닿지 못하면 status는 0이에요.
 *
 * @param {string} id
 * @returns {Promise<boolean>} 지운 행이 있으면 true. 이미 지워졌거나 내 것이 아니면 false예요
 */
export const removeCorrection = guardWrite(async (id) => {
  let response;
  try {
    const supabase = await getSupabase();
    // RLS에 막히면 오류 대신 0행이 지워져서, select로 지운 행을 돌려받아 확인합니다.
    response = await supabase.from('corrections').delete().eq('id', id).select('id');
  } catch (error) {
    throw toCorrectionError(error, 'REMOVE_FAILED');
  }
  if (response.error) throw toCorrectionError(response.error, 'REMOVE_FAILED', response.status);
  return response.data.length > 0;
});

/**
 * 보정이 가리키는 사진 하나를 다른 사진으로 바꿔요. 보정 id · 만든 시각 · 순서는 그대로예요.
 * 사진을 영구 삭제하기 전에 split · merge의 기준 사진을 옮길 때 써요(photoSort.buildAnchorMoves).
 * 새로 가리킬 사진이 남의 사진이면 서버가 거절해요.
 * 실패하면 { status, code, message }로 던져요. 서버에 닿지 못하면 status는 0이에요.
 *
 * @param {string} correctionId
 * @param {string} fromPhotoId
 * @param {string} toPhotoId
 * @returns {Promise<boolean>} 바꾼 연결이 있으면 true. 이미 옮겼거나 없으면 false예요
 */
export const moveCorrectionPhoto = guardWrite(async (correctionId, fromPhotoId, toPhotoId) => {
  let response;
  try {
    const supabase = await getSupabase();
    // RLS에 막히면 오류 대신 0행이 바뀌어서, select로 바꾼 행을 돌려받아 확인합니다.
    response = await supabase
      .from('correction_photos')
      .update({ photo_id: toPhotoId })
      .eq('correction_id', correctionId)
      .eq('photo_id', fromPhotoId)
      .select('id');
  } catch (error) {
    throw toCorrectionError(error, 'SAVE_FAILED');
  }
  if (response.error) throw toCorrectionError(response.error, 'SAVE_FAILED', response.status);
  return response.data.length > 0;
});
