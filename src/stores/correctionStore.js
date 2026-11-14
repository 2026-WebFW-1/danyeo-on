import { create } from 'zustand';

import { addCorrection, getCorrections, removeCorrection } from '@/services/correctionService';
import { useAuthStore } from '@/stores/authStore';

const INITIAL_STATE = { corrections: [], status: 'idle', error: null, pending: {} };

// reset할 때마다 올려요. 요청이 끝났을 때 값이 달라졌으면 앞 계정의 응답이라 버려요.
let generation = 0;

function createCorrectionId() {
  return `c_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function omit(map, key) {
  const { [key]: _removed, ...rest } = map;
  return rest;
}

/**
 * 사진을 빼는 요청이 진행 중인지 볼 때 쓰는 pending의 열쇠예요.
 * 지우는 요청의 열쇠는 보정 id 그대로예요.
 *
 * @param {string} photoId
 * @returns {string} 예: 'exclude:p_c2a066'
 */
export function getExcludeKey(photoId) {
  return `exclude:${photoId}`;
}

/**
 * 보정 데이터. 사용자가 자동 결과를 고친 기록이에요(이름 바꾸기 · 사진 빼기 …).
 * 07 사진 정리의 탭들과 01의 이동 수단 바꾸기가 같은 목록을 보고 고쳐서 스토어에 둬요.
 *
 * 화면에서는 useCorrections로 불러 두고 써요. 값 하나만 필요하면 골라서 꺼내요:
 * useCorrectionStore((state) => state.pending[correction.id])
 *
 * 아직 보정을 저장해도 Journey가 바뀌지 않아요(buildJourney로 다시 계산해 저장하는 일은 따로 해요).
 */
export const useCorrectionStore = create((set, get) => ({
  /** @type {import('@/types').Correction[]} 만든 순서. buildJourney에 그대로 넘길 수 있어요 */
  corrections: INITIAL_STATE.corrections,
  /** @type {'idle' | 'loading' | 'ready' | 'error'} */
  status: INITIAL_STATE.status,
  /** @type {{ status: number, code: string, message: string } | null} 불러오기 오류 */
  error: INITIAL_STATE.error,
  /** @type {Record<string, true>} 진행 중인 요청. 열쇠는 지울 때 보정 id, 사진을 뺄 때 getExcludeKey(photoId) */
  pending: INITIAL_STATE.pending,

  /** 보정을 불러와요. 실패해도 던지지 않고 status를 'error'로 둬요. */
  fetch: async () => {
    if (get().status === 'loading') return;

    const requested = generation;
    set({ status: 'loading', error: null });
    try {
      const corrections = await getCorrections();
      if (requested !== generation) return;
      set({ corrections, status: 'ready' });
    } catch (error) {
      if (requested !== generation) return;
      set({ status: 'error', error });
    }
  },

  /**
   * 보정을 저장해요. 끝난 뒤에 목록 끝에 붙어요.
   * 실패하면 목록을 그대로 두고 던져요.
   *
   * 같은 사진을 두 번 빼면 하나를 지워도 사진이 돌아오지 않아요(buildJourney는 빠진 사진을 ID로만 모아요).
   * 그래서 이미 뺀 사진이면 서버에 보내지 않고 있는 보정을 돌려줘요.
   * 이름·이동 수단은 여러 번 고쳐도 마지막 보정이 이겨서 그대로 쌓아요.
   *
   * @param {import('@/types').CorrectionInput} input
   * @returns {Promise<import('@/types').Correction>}
   */
  add: async (input) => {
    // 불러오기 전에는 이미 뺀 사진인지 알 수 없어요.
    if (get().status !== 'ready') throw new Error('보정을 불러온 뒤에 저장할 수 있어요');

    const excludeKey = input.type === 'exclude' ? getExcludeKey(input.photoId) : null;
    if (excludeKey) {
      const existing = get().corrections.find(
        (correction) => correction.type === 'exclude' && correction.photoId === input.photoId,
      );
      if (existing) return existing;
      // 버튼을 두 번 누르면 첫 요청이 끝나기 전이라 위에서 걸러지지 않아요.
      if (get().pending[excludeKey]) throw new Error(`이미 빼는 중인 사진이에요: ${input.photoId}`);
    }

    const requested = generation;
    const fields = { ...input, id: createCorrectionId() };
    if (excludeKey) set((state) => ({ pending: { ...state.pending, [excludeKey]: true } }));

    try {
      await addCorrection(fields);
    } catch (error) {
      if (excludeKey && requested === generation) {
        set((state) => ({ pending: omit(state.pending, excludeKey) }));
      }
      throw error;
    }

    // add_correction은 아무것도 돌려주지 않아서, 보낸 값으로 보정을 만들어요. createdAt은 다시 불러오면 서버 값으로 바뀌어요.
    const correction = {
      ...fields,
      ownerId: useAuthStore.getState().user?.id,
      createdAt: new Date().toISOString(),
    };
    if (requested === generation) {
      set((state) => ({
        corrections: [...state.corrections, correction],
        pending: excludeKey ? omit(state.pending, excludeKey) : state.pending,
      }));
    }
    return correction;
  },

  /**
   * 보정을 지워요. 끝난 뒤에 목록에서 빠져요. 뺀 사진을 되돌릴 때는 그 exclude 보정을 지워요.
   * 실패하면 목록을 그대로 두고 던져요.
   * 서버에 이미 없던 보정(다른 탭에서 지움)도 목록에서 빼요. 원한 결과와 서버 상태가 이미 같아서예요.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    if (get().pending[id]) throw new Error(`이미 지우는 중인 보정이에요: ${id}`);

    const requested = generation;
    set((state) => ({ pending: { ...state.pending, [id]: true } }));

    try {
      await removeCorrection(id);
    } catch (error) {
      if (requested === generation) set((state) => ({ pending: omit(state.pending, id) }));
      throw error;
    }

    if (requested === generation) {
      set((state) => ({
        corrections: state.corrections.filter((correction) => correction.id !== id),
        pending: omit(state.pending, id),
      }));
    }
  },

  /** 처음 상태로 되돌려요. 계정이 바뀌면 App이 불러요. */
  reset: () => {
    generation += 1;
    set(INITIAL_STATE);
  },
}));
