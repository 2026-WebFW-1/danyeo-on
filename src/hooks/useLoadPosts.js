import { useEffect } from 'react';

import { usePostStore } from '@/stores/postStore';

/**
 * 화면에 들어올 때 글(usePostStore)을 불러 두는 훅이에요. 03 전체 기록과 02 챕터가 같은 규칙으로 써요.
 *
 * const postsStatus = useLoadPosts();
 * // postsStatus: 'idle' | 'loading' | 'ready' | 'error'. 글은 usePostStore((state) => state.byDate)로 읽어요.
 *
 * 의도:
 *  - 아직 안 불렀거나(idle), 계정이 바뀌어 글이 처음 상태로 돌아갔으면(reset) 불러와요.
 *  - 스토어의 error는 계정이 바뀔 때까지 남아서, 다시 들어와도 안 부르면 새로고침하기 전까지 글이 계속 비어요.
 *    그래서 error로 남아 있어도 들어올 때 한 번 더 불러요. error를 계속 지켜보면 계속 실패할 때 요청이 반복돼서,
 *    들어올 때 한 번만 봐요(fetch는 바뀌지 않아요).
 *
 * @returns {'idle' | 'loading' | 'ready' | 'error'}
 */
export function useLoadPosts() {
  const status = usePostStore((state) => state.status);
  const fetchPosts = usePostStore((state) => state.fetch);

  useEffect(() => {
    if (status === 'idle') fetchPosts();
  }, [status, fetchPosts]);

  useEffect(() => {
    if (usePostStore.getState().status === 'error') fetchPosts();
  }, [fetchPosts]);

  return status;
}
