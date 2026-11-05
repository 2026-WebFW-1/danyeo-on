import { useEffect, useState } from 'react';

import { getMyPhotos } from '@/services/myPhotosService';
import { useAuthStore } from '@/stores/authStore';

// 아직 못 받았을 때 줄 빈 목록이에요. 같은 배열을 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_PHOTOS = [];
const LOADING = { photos: NO_PHOTOS, status: 'loading', error: null };

/**
 * 로그인한 사람의 사진 전부를 주는 훅이에요. 03 전체 기록과 02 챕터가 지점의 사진을 찾을 때 써요.
 * 이미 있는 usePhoto(사진 한 장의 주소)와 헷갈리지 않게 이름에 My를 붙였어요.
 *
 * const { photos, status, error } = useMyPhotos();
 *
 * 여러 화면에서 불러도 돼요. 사진은 myPhotosService가 계정마다 한 번만 읽어 두어서 모두 같은 배열을 받고,
 * 이 훅의 상태는 그 읽기가 끝났는지만 컴포넌트마다 들고 있어요. 그래서 스토어에 두지 않았어요(useJourney와 같아요).
 *
 * 오류를 던지지 않아요. 못 받는 동안과 실패했을 때도 photos는 빈 배열이라, 화면은 사진 칸을 회색으로 그리면 돼요.
 * 계정이 바뀌면 'loading'을 한 번 거쳐 새 계정의 사진을 줘요. 앞 계정의 사진은 그 사이에 보이지 않아요.
 *
 * @returns {{
 *   photos: import('@/types').Photo[],
 *   status: 'loading' | 'ready' | 'error',
 *   error: { status: number, code: string, message: string } | null,
 * }}
 */
export function useMyPhotos() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  // 결과가 어느 계정 것인지 같이 들고 있어서, 계정이 바뀐 직후 앞 계정의 결과를 내보내지 않아요.
  const [result, setResult] = useState({ userId: null, photos: NO_PHOTOS, error: null });

  useEffect(() => {
    if (!userId) return undefined;
    let isCurrent = true;
    getMyPhotos(userId).then(
      (photos) => isCurrent && setResult({ userId, photos, error: null }),
      (error) => isCurrent && setResult({ userId, photos: NO_PHOTOS, error }),
    );
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (!userId || result.userId !== userId) return LOADING;
  if (result.error) return { photos: NO_PHOTOS, status: 'error', error: result.error };
  return { photos: result.photos, status: 'ready', error: null };
}
