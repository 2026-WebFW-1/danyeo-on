import { useEffect } from 'react';

import { useCorrectionStore } from '@/stores/correctionStore';

/**
 * 화면에 들어올 때 보정(useCorrectionStore)을 불러 두고, 목록과 고치는 동작을 주는 훅이에요.
 * 07 사진 정리가 이걸로 이름 바꾸기 · 사진 빼기 · 되돌리기를 해요.
 *
 * const { corrections, status, add, remove } = useCorrections();
 * await add({ type: 'rename', anchorPhotoId, name });   // 그 사진이 든 여행의 이름 바꾸기
 * await add({ type: 'exclude', photoId });              // 사진 빼기
 * await remove(correction.id);                          // 되돌리기 = 그 보정 지우기
 *
 * 의도:
 *  - 여러 컴포넌트에서 불러도 돼요. 목록은 스토어 하나라 모두 같은 값을 보고, 불러오기도 한 번만 해요.
 *    값 하나만 필요한 컴포넌트는 스토어에서 골라 꺼내요: useCorrectionStore((state) => state.pending[id])
 *  - 아직 안 불렀거나(idle), 계정이 바뀌어 처음 상태로 돌아갔으면(reset) 불러와요.
 *  - 스토어의 error는 계정이 바뀔 때까지 남아서, error로 남아 있어도 들어올 때 한 번 더 불러요.
 *    error를 계속 지켜보면 계속 실패할 때 요청이 반복돼서, 들어올 때 한 번만 봐요(useLoadPosts와 같은 규칙).
 *
 * 주의할 점: add · remove는 실패하면 던져요. 부른 쪽이 잡아서 안내를 띄워요.
 * 아직 보정을 저장해도 Journey(01 · 02 · 03에 보이는 여행)는 바뀌지 않아요.
 *
 * @returns {{
 *   corrections: import('@/types').Correction[],
 *   status: 'idle' | 'loading' | 'ready' | 'error',
 *   error: { status: number, code: string, message: string } | null,
 *   add: (input: import('@/types').CorrectionInput) => Promise<import('@/types').Correction>,
 *   remove: (id: string) => Promise<void>,
 * }}
 */
export function useCorrections() {
  const corrections = useCorrectionStore((state) => state.corrections);
  const status = useCorrectionStore((state) => state.status);
  const error = useCorrectionStore((state) => state.error);
  const add = useCorrectionStore((state) => state.add);
  const remove = useCorrectionStore((state) => state.remove);
  const fetchCorrections = useCorrectionStore((state) => state.fetch);

  useEffect(() => {
    if (status === 'idle') fetchCorrections();
  }, [status, fetchCorrections]);

  useEffect(() => {
    if (useCorrectionStore.getState().status === 'error') fetchCorrections();
  }, [fetchCorrections]);

  return { corrections, status, error, add, remove };
}
