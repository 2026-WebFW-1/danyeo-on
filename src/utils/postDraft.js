// 저장하지 않은 글을 브라우저에 잠시 맡겨 두는 임시본이에요(14b).
// 사생활 보호 창 등에서 localStorage가 막히면 읽기·쓰기가 오류를 던져요. 편집기가 멈추지 않게 모두 삼켜요.

/**
 * @typedef {Pick<import('@/types').Post, 'title' | 'body' | 'tags' | 'photoIds'> & { savedAt: string }} PostDraft
 */

function getDraftKey(userId, date) {
  return `post-draft:${userId}:${date}`;
}

/**
 * 그 계정·날짜의 임시본을 읽어요. 없거나, 깨졌거나, 저장소를 못 쓰면 null이에요.
 *
 * @param {string} userId
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @returns {PostDraft | null}
 */
export function readDraft(userId, date) {
  try {
    const draft = JSON.parse(localStorage.getItem(getDraftKey(userId, date)));
    return typeof draft?.savedAt === 'string' ? draft : null;
  } catch {
    return null;
  }
}

/**
 * 지금 입력을 임시본으로 맡겨요. 맡긴 시각(savedAt)을 붙여요.
 *
 * @param {string} userId
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @param {Pick<import('@/types').Post, 'title' | 'body' | 'tags' | 'photoIds'>} post
 */
export function writeDraft(userId, date, { title, body, tags, photoIds }) {
  const draft = { title, body, tags, photoIds, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(getDraftKey(userId, date), JSON.stringify(draft));
  } catch {
    // 맡기지 못해도 편집기 안의 입력은 그대로예요.
  }
}

/**
 * @param {string} userId
 * @param {string} date 현지 날짜 YYYY-MM-DD
 */
export function clearDraft(userId, date) {
  try {
    localStorage.removeItem(getDraftKey(userId, date));
  } catch {
    // 지우지 못하면 다음에 열 때 서버 글보다 오래돼서 묻지 않아요.
  }
}

/**
 * 임시본이 서버 글보다 나중에 맡겨졌는지 봐요. 서버에 글이 없으면 늘 true예요.
 *
 * @param {PostDraft} draft
 * @param {Pick<import('@/types').Post, 'updatedAt'> | undefined} post
 * @returns {boolean}
 */
export function isDraftNewer(draft, post) {
  if (!post) return true;
  return Date.parse(draft.savedAt) > Date.parse(post.updatedAt);
}
