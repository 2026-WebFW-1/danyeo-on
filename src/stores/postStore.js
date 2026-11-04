import { create } from 'zustand';

import { getPosts, savePost } from '@/services/postService';
import { useAuthStore } from '@/stores/authStore';

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const INITIAL_STATE = { byDate: {}, status: 'idle', error: null, saving: {}, saveError: {} };

// reset할 때마다 올려요. 요청이 끝났을 때 값이 달라졌으면 앞 계정의 응답이라 버려요.
let generation = 0;

function createPostId() {
  return `post_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function omit(map, key) {
  const { [key]: _removed, ...rest } = map;
  return rest;
}

/**
 * 글 데이터. 화면에서는 날짜 하나에 글 하나예요(피그마 14a).
 * DB는 같은 날 여러 개를 받을 수 있지만, 앱은 그날 글이 있으면 그 id로 고쳐서 늘리지 않아요.
 *
 * 저장 버튼은 status가 'ready'이고 saving[date]가 아닐 때만 켜 주세요.
 * 불러오기 전에 저장하면 그날 글을 못 찾아 같은 날 글이 늘어날 수 있어요. 저장 중인 날짜는 스토어도 던져요.
 *
 * 꺼낼 땐 필요한 값만 골라요: usePostStore((state) => state.byDate[date])
 */
export const usePostStore = create((set, get) => ({
  /** @type {Record<string, import('@/types').Post>} */
  byDate: INITIAL_STATE.byDate,
  /** @type {'idle' | 'loading' | 'ready' | 'error'} */
  status: INITIAL_STATE.status,
  /** @type {{ status: number, code: string, message: string } | null} 불러오기 오류 */
  error: INITIAL_STATE.error,
  /** @type {Record<string, true>} 저장 중인 날짜 */
  saving: INITIAL_STATE.saving,
  /** @type {Record<string, { status: number, code: string, message: string }>} 날짜별 마지막 저장 오류 */
  saveError: INITIAL_STATE.saveError,

  /** 글을 불러와 날짜로 묶어요. 실패해도 던지지 않고 status를 'error'로 둬요. */
  fetch: async () => {
    if (get().status === 'loading') return;

    const requested = generation;
    set({ status: 'loading', error: null });
    try {
      const posts = await getPosts();
      if (requested !== generation) return;
      set({
        byDate: Object.fromEntries(posts.map((post) => [post.date, post])),
        status: 'ready',
      });
    } catch (error) {
      if (requested !== generation) return;
      set({ status: 'error', error });
    }
  },

  /**
   * 그날 글을 저장해요. 끝난 뒤에 byDate가 바뀌어요.
   * 실패하면 byDate를 그대로 두고 saveError[date]를 남긴 뒤 던져요. 편집기가 쓴 내용을 지키게요.
   * @param {Pick<import('@/types').Post, 'date' | 'title' | 'body' | 'tags' | 'photoIds'>} input
   * @returns {Promise<import('@/types').Post>}
   */
  save: async ({ date, title, body, tags, photoIds }) => {
    if (!DATE_FORMAT.test(date)) throw new Error(`날짜 형식이 YYYY-MM-DD가 아니에요: ${date}`);
    // 겹쳐 저장하면 새 날짜에 서로 다른 id가 만들어져 같은 날 글이 늘어나요(#110 리뷰).
    if (get().saving[date]) throw new Error(`이미 저장 중인 날짜예요: ${date}`);

    const requested = generation;
    const previous = get().byDate[date];
    const fields = { id: previous?.id ?? createPostId(), date, title, body, tags, photoIds };
    set((state) => ({
      saving: { ...state.saving, [date]: true },
      saveError: omit(state.saveError, date),
    }));

    try {
      await savePost(fields);
    } catch (error) {
      if (requested === generation) {
        set((state) => ({
          saving: omit(state.saving, date),
          saveError: { ...state.saveError, [date]: error },
        }));
      }
      throw error;
    }

    // save_post는 아무것도 돌려주지 않아서, 보낸 값으로 글을 만들어요.
    const post = {
      ...fields,
      ownerId: previous?.ownerId ?? useAuthStore.getState().user?.id,
      updatedAt: new Date().toISOString(),
    };
    if (requested === generation) {
      set((state) => ({
        byDate: { ...state.byDate, [date]: post },
        saving: omit(state.saving, date),
      }));
    }
    return post;
  },

  /** 처음 상태로 되돌려요. 계정이 바뀌면 App이 불러요. */
  reset: () => {
    generation += 1;
    set(INITIAL_STATE);
  },
}));
