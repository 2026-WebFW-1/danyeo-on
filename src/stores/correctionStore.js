import { create } from 'zustand';

import {
  addCorrection,
  getCorrections,
  moveCorrectionPhoto,
  removeCorrection,
} from '@/services/correctionService';
import { refreshJourney } from '@/services/journeyService';
import { useAuthStore } from '@/stores/authStore';
import { invertAnchorMove } from '@/utils/photoSort';

const INITIAL_STATE = {
  corrections: [],
  status: 'idle',
  error: null,
  pending: {},
  journeyStatus: 'idle',
};

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

// 가장 나중에 시작한 Journey 계산의 번호예요. 앞선 계산이 늦게 끝나 상태를 덮지 않게 해요.
let refreshId = 0;

// 보정을 서버에 보내기 전에 "이 계정은 Journey를 다시 계산해야 함"을 브라우저에 남기고, 계산이 저장되면 지워요.
// 계산이 첫 번에 20초 남짓 걸려서, 그사이 탭을 닫거나 계정을 바꾸거나 실패한 채 떠나면 보정만 저장되고
// Journey는 옛 상태로 남아요. 표시가 남아 있으면 그 계정으로 다시 들어올 때 이어서 계산해요(resumeJourneyRefresh).
// 다른 기기에는 남지 않아요.
// 표시에는 남길 때마다 새 값을 넣어요. 같은 계정을 연 다른 탭도 같은 표시를 보고 바꿔서, 계산이 끝났을 때
// 값이 그대로인지로 그사이 어느 탭에서든 보정이 바뀌었는지 알 수 있어요.
const getStaleKey = (ownerId) => `danyeo-on:journey-stale:${ownerId}`;

/** @type {Map<string, string>} 계정 id → 표시 값. 브라우저 저장소를 못 쓰면(사생활 보호 모드 등) 이 탭에서는 여기를 봐요 */
const memoryMarks = new Map();
/** @type {Set<string>} 마지막 표시를 저장소에 쓰지 못한 계정 */
const memoryOnlyOwners = new Set();
/** @type {Set<string>} 지금 보정을 서버에 보내는 중인 계정 */
const writingOwners = new Set();
/** @type {Map<string, number>} 계정 id → 이 탭에서 그 계정의 가장 나중 계산 번호 */
const latestRefreshOf = new Map();

function markJourneyStale(ownerId) {
  const mark = crypto.randomUUID();
  memoryMarks.set(ownerId, mark);
  try {
    localStorage.setItem(getStaleKey(ownerId), mark);
    memoryOnlyOwners.delete(ownerId);
  } catch {
    memoryOnlyOwners.add(ownerId);
  }
}

/** @returns {string | null} 표시 값. 없으면 null */
function getStaleMark(ownerId) {
  if (!memoryOnlyOwners.has(ownerId)) {
    try {
      return localStorage.getItem(getStaleKey(ownerId));
    } catch {
      // 읽지 못하면 이 탭의 표시를 봐요.
    }
  }
  return memoryMarks.get(ownerId) ?? null;
}

function clearStaleMark(ownerId) {
  memoryMarks.delete(ownerId);
  memoryOnlyOwners.delete(ownerId);
  try {
    localStorage.removeItem(getStaleKey(ownerId));
  } catch {
    // 지우지 못하면 다음에 들어올 때 한 번 더 계산할 뿐이에요.
  }
}

/**
 * 저장이 끝난 계산이 모든 보정을 읽었으면 표시를 지우고, 아니면 다시 남겨요.
 * 시작할 때 보내는 중이던 보정은 못 읽었을 수 있어요. 계산하는 사이 표시가 바뀌었거나(이 탭이나 다른 탭에서 새 보정)
 * 지워졌으면(다른 탭의 계산이 먼저 저장) 이 계산이 더 새 Journey를 덮었을 수 있어서, 다음에 들어올 때 다시 계산해요.
 *
 * @param {string} ownerId
 * @param {string | null} markAtStart 계산을 시작할 때의 표시 값
 * @param {boolean} wasWriting 계산을 시작할 때 이 탭에서 보정을 보내는 중이었는지
 */
function settleStaleMark(ownerId, markAtStart, wasWriting) {
  if (!wasWriting && getStaleMark(ownerId) === markAtStart) clearStaleMark(ownerId);
  else markJourneyStale(ownerId);
}

/**
 * 보정 하나를 서버에 보내요. 보내기 전에 표시를 남겨서, 저장된 뒤 계산하지 못해도 다음에 들어올 때 계산해요.
 *
 * @param {string | undefined} ownerId
 * @param {() => Promise<unknown>} write
 */
async function writeCorrection(ownerId, write) {
  if (ownerId) {
    markJourneyStale(ownerId);
    writingOwners.add(ownerId);
  }
  try {
    return await write();
  } finally {
    writingOwners.delete(ownerId);
  }
}

/**
 * 그 계정의 Journey를 다시 계산해 저장하고 journeyStatus에 진행 상태를 둬요. 실패해도 던지지 않아요.
 * 겹쳐 부르면 journeyService가 마지막 계산만 저장하고 모두 그 결과를 받아서, 상태도 마지막 계산을 따라가요.
 *
 * @param {(partial: object) => void} set
 * @param {string | undefined} ownerId 계산할 계정
 * @returns {Promise<void>}
 */
async function startRefresh(set, ownerId) {
  if (!ownerId) return;

  const requested = generation;
  refreshId += 1;
  const currentRefresh = refreshId;
  // 계정이 바뀌었거나 새 계산이 시작됐으면 이 계산의 결과로 상태를 바꾸지 않아요.
  const isStale = () => requested !== generation || currentRefresh !== refreshId;
  latestRefreshOf.set(ownerId, currentRefresh);
  const wasWriting = writingOwners.has(ownerId);
  const markAtStart = getStaleMark(ownerId);
  set({ journeyStatus: 'building' });
  try {
    await refreshJourney(ownerId);
  } catch (error) {
    if (isStale()) return;
    console.error(error);
    set({ journeyStatus: 'failed' });
    return;
  }
  // 계정이 바뀐 뒤에 끝났어도 그 계정의 표시는 정리해요. 이 탭에서 그 계정의 계산을 또 시작했으면 그 계산에 맡겨요.
  // 앞 계산은 뒤 계산의 결과를 받아서(#148), 여기서 다시 남기면 연달아 고칠 때마다 다음 로그인에 또 계산해요.
  if (latestRefreshOf.get(ownerId) === currentRefresh)
    settleStaleMark(ownerId, markAtStart, wasWriting);
  if (isStale()) return;
  set({ journeyStatus: 'saved' });
}

/**
 * 차례가 온 보정 하나를 저장하고 목록 끝에 붙여요. add · addMany가 써요.
 * 차례가 온 뒤에 이미 뺀 사진인지 찾아요. 부를 때 찾으면, 지우는 중인 보정을 돌려주고 곧 그 보정이 지워져 빼기가 사라져요.
 *
 * @returns {Promise<{ correction: import('@/types').Correction, isWritten: boolean }>}
 *   isWritten: 서버에 보냈으면 true. 이미 뺀 사진이라 있는 보정을 돌려줬으면 false
 */
async function saveOne(get, set, input, ownerId, requested) {
  assertSameAccount(requested);

  const key = getSaveKey(input);
  if (key) {
    const existing = get().corrections.find((correction) => getSaveKey(correction) === key);
    if (existing) return { correction: existing, isWritten: false };
  }

  const fields = { ...input, id: createCorrectionId() };
  await writeCorrection(ownerId, () => addCorrection(fields));
  assertSameAccount(requested);

  // add_correction은 아무것도 돌려주지 않아서, 보낸 값으로 보정을 만들어요. createdAt은 다시 불러오면 서버 값으로 바뀌어요.
  const correction = { ...fields, ownerId, createdAt: new Date().toISOString() };
  set((state) => ({ corrections: [...state.corrections, correction] }));
  return { correction, isWritten: true };
}

/**
 * 차례가 온 보정 하나를 지우고 목록에서 빼요. remove · removeMany가 써요.
 *
 * @returns {Promise<boolean>} 서버에 보냈으면 true. 목록에 이미 없으면(버튼을 두 번 누름) 보내지 않고 false
 */
async function deleteOne(get, set, id, ownerId, requested) {
  assertSameAccount(requested);
  if (!get().corrections.some((correction) => correction.id === id)) return false;

  await writeCorrection(ownerId, () => removeCorrection(id));
  assertSameAccount(requested);
  set((state) => ({
    corrections: state.corrections.filter((correction) => correction.id !== id),
  }));
  return true;
}

/**
 * 보정 하나의 사진 칸을 move대로 바꾼 값이에요. split은 beforePhotoId, merge는 photoIds의 그 자리를 바꿔요.
 *
 * @param {import('@/types').Correction} correction
 * @param {import('@/utils/photoSort').AnchorMove} move
 * @returns {import('@/types').Correction}
 */
function applyAnchorMove(correction, move) {
  if (correction.type === 'split') return { ...correction, beforePhotoId: move.toPhotoId };
  if (correction.type === 'merge') {
    return {
      ...correction,
      photoIds: correction.photoIds.map((id) => (id === move.fromPhotoId ? move.toPhotoId : id)),
    };
  }
  return correction;
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
 * 같은 사진 제외나 같은 여행 쌍은 한 번만 저장해요. 삭제 후 다시 요청하면 새 보정이 돼요.
 * @param {import('@/types').CorrectionInput} input
 * @returns {string | null}
 */
function getSaveKey(input) {
  if (input.type === 'exclude') return getExcludeKey(input.photoId);
  if (input.type === 'merge') return `merge:${JSON.stringify(input.photoIds)}`;
  return null;
}

/**
 * 보정 데이터. 사용자가 자동 결과를 고친 기록이에요(이름 바꾸기 · 사진 빼기 …).
 * 07 사진 정리의 탭들과 01의 이동 수단 바꾸기가 같은 목록을 보고 고쳐서 스토어에 둬요.
 *
 * 화면에서는 useCorrections로 불러 두고 써요. 값 하나만 필요하면 골라서 꺼내요:
 * useCorrectionStore((state) => state.pending[correction.id])
 *
 * 보정을 저장·삭제하면 Journey를 다시 계산해 journeys에 써요(#151). 그러면 01 · 02 · 03이 새 Journey를 다시 읽어요.
 * 07 밖(01의 이동 수단 바꾸기)에서 고쳐도 빠지지 않게, 화면이 아니라 스토어가 불러요.
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
  /**
   * 보정을 바꾼 뒤 Journey를 다시 계산해 쓰는 상태예요. 07이 "여행을 정리하는 중…"과 [다시 시도]를 그릴 때 봐요.
   * 보정 저장과 따로 둬서, 계산이 실패해도 보정은 저장된 채로 Journey만 다시 만들 수 있어요(업로드의 journeyStatus와 같은 틀).
   * @type {'idle' | 'building' | 'saved' | 'failed'}
   */
  journeyStatus: INITIAL_STATE.journeyStatus,

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
   * 저장하면 Journey 계산을 시작하지만 기다리지 않아요. 계산 상태는 journeyStatus로 봐요.
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
    const key = getSaveKey(input);
    if (key) startPending(set, key);

    try {
      return await enqueue(ownerId, async () => {
        const { correction, isWritten } = await saveOne(get, set, input, ownerId, requested);
        if (isWritten) void startRefresh(set, ownerId);
        return correction;
      });
    } finally {
      if (key) endPending(set, key, requested);
    }
  },

  /**
   * 보정 여럿을 준 순서대로 저장하고, Journey 계산은 끝에 한 번만 시작해요.
   * 07b 묶음 빼기처럼 한꺼번에 고칠 때 써요. add를 여러 번 부르면 보정마다 전체 사진을 다시 읽어 계산해요.
   * 하나씩 add와 같은 규칙으로 저장해요(이미 뺀 사진은 보내지 않아요). 중간에 실패하면 거기서 멈추고 던지지만,
   * 앞서 저장한 보정은 목록에 남고 그만큼 계산해요. 다시 부르면 이미 뺀 사진은 건너뛰어요.
   *
   * @param {import('@/types').CorrectionInput[]} inputs
   * @returns {Promise<import('@/types').Correction[]>} inputs와 같은 순서
   */
  addMany: async (inputs) => {
    if (get().status !== 'ready') throw new Error('보정을 불러온 뒤에 저장할 수 있어요');

    const requested = generation;
    const ownerId = useAuthStore.getState().user?.id;
    const keys = inputs.map(getSaveKey).filter(Boolean);
    keys.forEach((key) => startPending(set, key));

    try {
      return await enqueue(ownerId, async () => {
        let hasWritten = false;
        try {
          const saved = [];
          // 차례대로 보내요. 앞 보정이 저장된 뒤에 다음을 보내야, 중간에 실패해도 준 순서의 앞부분만 남아요.
          for (const input of inputs) {
            const { correction, isWritten } = await saveOne(get, set, input, ownerId, requested);
            hasWritten ||= isWritten;
            saved.push(correction);
          }
          return saved;
        } finally {
          // 계정이 바뀌었으면 계산하지 않아요. 표시가 남아 그 계정으로 다시 들어올 때 계산해요.
          if (hasWritten && requested === generation) void startRefresh(set, ownerId);
        }
      });
    } finally {
      keys.forEach((key) => endPending(set, key, requested));
    }
  },

  /**
   * 보정을 지워요. 끝난 뒤에 목록에서 빠져요. 뺀 사진을 되돌릴 때는 그 exclude 보정을 지워요.
   * 앞서 부른 저장·삭제가 끝난 뒤에 보내요.
   * 실패하면 목록을 그대로 두고 던져요. 기다리는 사이 계정이 바뀌면 code: 'ACCOUNT_CHANGED'로 던져요.
   * 서버에 이미 없던 보정(다른 탭에서 지움)도 목록에서 빼요. 원한 결과와 서버 상태가 이미 같아서예요.
   * 지우면 Journey 계산을 시작하지만 기다리지 않아요. 계산 상태는 journeyStatus로 봐요.
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
        // 서버에 이미 없던 보정이어도 계산해요. 지운 쪽 탭이 계산하지 못하고 닫혔을 수 있어요.
        if (await deleteOne(get, set, id, ownerId, requested)) void startRefresh(set, ownerId);
      });
    } finally {
      endPending(set, id, requested);
    }
  },

  /**
   * 보정 여럿을 차례로 지우고, Journey 계산은 끝에 한 번만 시작해요. [복구]가 같은 사진의 exclude를 모두 지울 때 써요.
   * 중간에 실패하면 거기서 멈추고 던지지만, 앞서 지운 보정은 목록에서 빠지고 그만큼 계산해요.
   *
   * @param {string[]} ids
   * @returns {Promise<void>}
   */
  removeMany: async (ids) => {
    const requested = generation;
    const ownerId = useAuthStore.getState().user?.id;
    ids.forEach((id) => startPending(set, id));

    try {
      await enqueue(ownerId, async () => {
        let hasDeleted = false;
        try {
          for (const id of ids) {
            hasDeleted = (await deleteOne(get, set, id, ownerId, requested)) || hasDeleted;
          }
        } finally {
          if (hasDeleted && requested === generation) void startRefresh(set, ownerId);
        }
      });
    } finally {
      ids.forEach((id) => endPending(set, id, requested));
    }
  },

  /**
   * 보정이 가리키는 사진을 차례로 바꿔요. 사진을 영구 삭제하기 전에 split · merge의 기준을 옮길 때 써요.
   * 앞서 부른 저장·삭제가 끝난 뒤에 보내요. 중간에 실패하면 앞서 옮긴 것을 되돌려 놓고 던져요.
   * 옮겨도 여행은 그대로라 Journey 계산은 시작하지 않아요. 뒤이어 exclude를 지울 때(removeMany) 계산해요.
   * 기다리는 사이 계정이 바뀌면 code: 'ACCOUNT_CHANGED'로 던져요.
   *
   * 무엇을 옮길지는 차례가 온 뒤의 보정 목록으로 정해요(saveOne과 같은 이유). 누를 때 정하면, 앞서 다른 사진을 지우며
   * 옮긴 기준을 모르고 그 사진으로 옮겼다가 같이 지워질 수 있어요.
   *
   * @param {(corrections: import('@/types').Correction[]) => import('@/utils/photoSort').AnchorMove[]} buildMoves
   * @returns {Promise<import('@/utils/photoSort').AnchorMove[]>} 옮긴 것
   */
  moveAnchors: async (buildMoves) => {
    const requested = generation;
    const ownerId = useAuthStore.getState().user?.id;
    return enqueue(ownerId, async () => {
      assertSameAccount(requested);
      const moves = buildMoves(get().corrections);
      const moveOne = async (move) => {
        assertSameAccount(requested);
        await writeCorrection(ownerId, () =>
          moveCorrectionPhoto(move.correctionId, move.fromPhotoId, move.toPhotoId),
        );
        assertSameAccount(requested);
        set((state) => ({
          corrections: state.corrections.map((correction) =>
            correction.id === move.correctionId ? applyAnchorMove(correction, move) : correction,
          ),
        }));
      };

      const moved = [];
      try {
        for (const move of moves) {
          await moveOne(move);
          moved.push(move);
        }
      } catch (error) {
        // 일부만 옮긴 채 사진을 지우지 않으면, [복구]했을 때 나눈 자리가 옮긴 사진으로 바뀌어 있어요. 되돌려 놓아요.
        for (const move of moved.toReversed()) {
          await moveOne(invertAnchorMove(move)).catch((undoError) => console.error(undoError));
        }
        throw error;
      }
      return moves;
    });
  },

  /** Journey 계산을 다시 해요. journeyStatus가 'failed'일 때 [다시 시도]가 불러요. 던지지 않아요. */
  refreshJourney: () => startRefresh(set, useAuthStore.getState().user?.id),

  /**
   * 지난번에 보정을 보낸 뒤 Journey를 다 계산하지 못했으면 이어서 계산해요. 로그인하면 App이 불러요. 던지지 않아요.
   * 탭을 닫았거나, 계산하는 사이 계정을 바꿨거나, 계산이 실패한 채 떠났을 때예요.
   */
  resumeJourneyRefresh: async () => {
    const ownerId = useAuthStore.getState().user?.id;
    if (ownerId && getStaleMark(ownerId) !== null) await startRefresh(set, ownerId);
  },

  /** 처음 상태로 되돌려요. 계정이 바뀌면 App이 불러요. 앞 계정의 계산은 끝나도 journeyStatus를 바꾸지 않아요. */
  reset: () => {
    generation += 1;
    // 요청 줄은 계정별이라 여기서 비우지 않아요. 앞 계정의 줄에 남은 요청은 차례가 오면 assertSameAccount에서 멈춰요.
    pendingCounts.clear();
    set(INITIAL_STATE);
  },
}));
