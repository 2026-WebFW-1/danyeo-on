import { getSupabase } from './getSupabase';
import { getMyData } from './photoService';

function toPostError(error, fallbackCode, status = 0) {
  return { status, code: error.code || fallbackCode, message: error.message };
}

/**
 * 로그인한 사람의 글을 날짜 순서로 가져와요.
 * 실패하면 { status, code, message }로 던져요. getMyData의 오류에는 HTTP 상태가 없어서 status는 0이에요.
 * @returns {Promise<import('@/types').Post[]>}
 */
export async function getPosts() {
  try {
    const { posts } = await getMyData();
    return posts;
  } catch (error) {
    throw toPostError(error, 'LOAD_FAILED');
  }
}

/**
 * 글을 저장해요. 같은 id가 있으면 태그·사진까지 통째로 바꾸고, 없으면 새로 만들어요.
 * 서버는 아무것도 돌려주지 않아요.
 * 실패하면 { status, code, message }로 던져요. 서버에 닿지 못하면 status는 0이에요.
 * @param {Pick<import('@/types').Post, 'id' | 'date' | 'title' | 'body' | 'tags' | 'photoIds'>} post
 * @returns {Promise<void>}
 */
export async function savePost(post) {
  let response;
  try {
    const supabase = await getSupabase();
    response = await supabase.rpc('save_post', { post });
  } catch (error) {
    throw toPostError(error, 'SAVE_FAILED');
  }
  if (response.error) throw toPostError(response.error, 'SAVE_FAILED', response.status);
}

/**
 * 글 하나를 지워요. 붙은 사진·태그 연결은 DB가 같이 지워요(cascade).
 * 실패하면 { status, code, message }로 던져요. 서버에 닿지 못하면 status는 0이에요.
 *
 * @param {string} id
 * @returns {Promise<boolean>} 지운 행이 있으면 true. 이미 지워졌거나 내 것이 아니면 false예요
 */
export async function removePost(id) {
  let response;
  try {
    const supabase = await getSupabase();
    // RLS에 막히면 오류 대신 0행이 지워져서, select로 지운 행을 돌려받아 확인합니다.
    response = await supabase.from('posts').delete().eq('id', id).select('id');
  } catch (error) {
    throw toPostError(error, 'REMOVE_FAILED');
  }
  if (response.error) throw toPostError(response.error, 'REMOVE_FAILED', response.status);
  return response.data.length > 0;
}
