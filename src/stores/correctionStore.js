import { create } from 'zustand';

import { addCorrection, getCorrections, removeCorrection } from '@/services/correctionService';
import { useAuthStore } from '@/stores/authStore';

const INITIAL_STATE = { corrections: [], status: 'idle', error: null, pending: {} };

// reset할 때마다 올려요. 요청이 끝났을 때 값이 달라졌으면 앞 계정의 응답이라 버려요.
let generation = 0;

// 저장·삭제는 부른 순서대로 하나씩 보내요. 이름·이동 수단은 마지막 보정이 이기는데, 겹쳐 보내면 먼저 누른 요청이
// 늦게 끝나 옛 값이 마지막이 될 수 있어요. 어느 보정이 같은 여행을 가리키는지는 사진 묶음을 알아야 해서
// 스토어는 알 수 없으니, 대상별로 나누지 않고 계정마다 한 줄로 세워요.
// 줄을 계정별로 두는 이유: 다른 계정의 느린 요청 뒤에서 기다리지 않게 하고,
// 로그아웃했다 같은 계정으로 다시 들어와도 앞서 보낸 요청과 순서가 뒤바뀌지 않게 해요.
/** @type {Map<string | undefined, Promise<void>>} 계정 id → 그 계정의 마지막 요청이 끝나는 때 */
const queues = new Map();

/**
 * 그 계정이 앞서 부른 요청이 끝난 뒤에 task를 실행해요. 앞 요청이 실패해도 다음 요청은 실행해요.
 *
 * @template T
 * @param {string | undefined} ownerId 요청을 부른 계정
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
async function enqueue(ownerId, task) {
  const previous = queues.get(ownerId);
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  queues.set(ownerId, current);

  await previous;
  try {
    return await task();
  } finally {
    release();
    // 뒤에 줄 선 요청이 없으면 줄을 지워요. 계정을 여러 번 바꿔도 Map이 쌓이지 않아요.
    if (queues.get(ownerId) === current) queues.delete(ownerId);
  }
}

/**
 * 요청을 부른 뒤로 계정이 바뀌었으면 던져요. 요청은 지금 세션으로 나가서, 그대로 보내면 다른 계정에 저장돼요.
 * 이미 보낸 요청이면 앞 계정에는 반영됐지만, 지금 계정의 화면이 성공으로 받으면 안 돼요.
 *
 * @param {number} requested 요청을 부를 때의 generation
 */
function assertSameAccount(requested) {
  if (requested !== generation) {
    throw { status: 0, code: 'ACCOUNT_CHANGED', message: '요청하는 사이에 계정이 바뀌었어요' };
  }
}

// 같은 열쇠의 요청이 여럿 줄 서 있을 수 있어서 개수를 세요. 마지막 요청이 끝날 때 pending에서 지워요.
const pendingCounts = new Map();

function startPending(set, key) {
  pendingCounts.set(key, (pendingCounts.get(key) ?? 0) + 1);
  set((state) => ({ pending: { ...state.pending, [key]: true } }));
}

function endPending(set, key, requested) {
  // 계정이 바뀌었으면 reset이 이미 비웠어요.
  if (requested !== generation) return;

  const left = pendingCounts.get(key) - 1;
  if (left > 0) {
    pendingCounts.set(key, left);
    return;
  }
  pendingCounts.delete(key);
  set((state) => ({ pending: omit(state.pending, key) }));
}

function createCorrectionId() {
  return `c_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function omit(map, key) {
  const { [key]: _removed, ...rest } = map;
  return rest;
}

/**
 * 사진을 빼는 요청이 진행 중인지 볼 때 쓰는 pending의 열쇠예요.
 * 지우는 요청의 열쇠는 보정 id 그대로예요. 차례를 기다리는 요청도 진행 중으로 표시해요.
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
   * 보정을 저장해요. 끝난 뒤에 목록 끝에 붙어요. 앞서 부른 저장·삭제가 끝난 뒤에 보내요.
   * 실패하면 목록을 그대로 두고 던져요. 기다리는 사이 계정이 바뀌면 code: 'ACCOUNT_CHANGED'로 던져요.
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

    const requested = generation;
    // 끝난 뒤에 읽으면 그사이 바뀐 계정의 id가 붙을 수 있어서, 부를 때의 주인을 들고 있어요.
    const ownerId = useAuthStore.getState().user?.id;
    const excludeKey = input.type === 'exclude' ? getExcludeKey(input.photoId) : null;
    if (excludeKey) startPending(set, excludeKey);

    try {
      return await enqueue(ownerId, async () => {
        assertSameAccount(requested);

        // 차례가 온 뒤에 찾아요. 부를 때 찾으면, 지우는 중인 보정을 돌려주고 곧 그 보정이 지워져 빼기가 사라져요.
        if (input.type === 'exclude') {
          const existing = get().corrections.find(
            (correction) => correction.type === 'exclude' && correction.photoId === input.photoId,
          );
          if (existing) return existing;
        }

        const fields = { ...input, id: createCorrectionId() };
        await addCorrection(fields);
        assertSameAccount(requested);

        // add_correction은 아무것도 돌려주지 않아서, 보낸 값으로 보정을 만들어요. createdAt은 다시 불러오면 서버 값으로 바뀌어요.
        const correction = { ...fields, ownerId, createdAt: new Date().toISOString() };
        set((state) => ({ corrections: [...state.corrections, correction] }));
        return correction;
      });
    } finally {
      if (excludeKey) endPending(set, excludeKey, requested);
    }
  },

  /**
   * 보정을 지워요. 끝난 뒤에 목록에서 빠져요. 뺀 사진을 되돌릴 때는 그 exclude 보정을 지워요.
   * 앞서 부른 저장·삭제가 끝난 뒤에 보내요.
   * 실패하면 목록을 그대로 두고 던져요. 기다리는 사이 계정이 바뀌면 code: 'ACCOUNT_CHANGED'로 던져요.
   * 서버에 이미 없던 보정(다른 탭에서 지움)도 목록에서 빼요. 원한 결과와 서버 상태가 이미 같아서예요.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  remove: async (id) => {
    const requested = generation;
    const ownerId = useAuthStore.getState().user?.id;
    startPending(set, id);

    try {
      await enqueue(ownerId, async () => {
        assertSameAccount(requested);
        // 버튼을 두 번 누르면 앞 요청이 이미 지웠어요. 서버에 다시 보내지 않아요.
        if (!get().corrections.some((correction) => correction.id === id)) return;

        await removeCorrection(id);
        assertSameAccount(requested);
        set((state) => ({
          corrections: state.corrections.filter((correction) => correction.id !== id),
        }));
      });
    } finally {
      endPending(set, id, requested);
    }
  },

  /** 처음 상태로 되돌려요. 계정이 바뀌면 App이 불러요. */
  reset: () => {
    generation += 1;
    // 요청 줄은 계정별이라 여기서 비우지 않아요. 앞 계정의 줄에 남은 요청은 차례가 오면 assertSameAccount에서 멈춰요.
    pendingCounts.clear();
    set(INITIAL_STATE);
  },
}));
