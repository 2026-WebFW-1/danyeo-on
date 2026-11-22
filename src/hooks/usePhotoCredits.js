import { useEffect, useState } from 'react';

import { useMyPhotos } from '@/hooks/useMyPhotos';
import { getPhotoCredits } from '@/services/creditService';

// 못 받았을 때 줄 빈 목록이에요. 같은 배열을 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_CREDITS = [];
const LOADING = { credits: NO_CREDITS, status: 'loading' };
const FAILED = { credits: NO_CREDITS, status: 'error' };

/**
 * 로그인한 사람의 사진 가운데 데모 사진의 출처를 주는 훅이에요. 출처 페이지(/credits)가 써요.
 *
 * const { credits, status } = usePhotoCredits();
 *
 * 오류를 던지지 않아요. 사진이나 출처 파일을 못 받으면 status가 'error'이고 credits는 빈 배열이에요.
 * 직접 올린 사진만 있는 계정은 요청 없이 'ready'와 빈 배열이에요.
 * 계정이 바뀌거나 사진을 새로 읽으면 'loading'을 거쳐요. 앞 계정의 출처는 그 사이에 보이지 않아요.
 *
 * @returns {{ credits: import('@/types').PhotoCredit[], status: 'loading' | 'ready' | 'error' }}
 */
export function usePhotoCredits() {
  const { photos, status: photosStatus } = useMyPhotos();
  // 결과가 어느 사진 목록의 것인지 같이 들고 있어서, 목록이 바뀐 직후 앞 결과를 내보내지 않아요.
  const [result, setResult] = useState({ photos: null, credits: NO_CREDITS, hasError: false });

  useEffect(() => {
    if (photosStatus !== 'ready') return undefined;
    let isCurrent = true;
    getPhotoCredits(photos.map((photo) => photo.fileKey)).then(
      (credits) => isCurrent && setResult({ photos, credits, hasError: false }),
      () => isCurrent && setResult({ photos, credits: NO_CREDITS, hasError: true }),
    );
    return () => {
      isCurrent = false;
    };
  }, [photos, photosStatus]);

  if (photosStatus === 'error') return FAILED;
  if (photosStatus !== 'ready' || result.photos !== photos) return LOADING;
  if (result.hasError) return FAILED;
  return { credits: result.credits, status: 'ready' };
}
