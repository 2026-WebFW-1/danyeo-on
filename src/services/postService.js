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
