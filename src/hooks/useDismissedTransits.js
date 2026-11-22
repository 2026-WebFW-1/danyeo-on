import { useState } from 'react';

import { useAuthStore } from '@/stores/authStore';

const getKey = (userId) => `danyeo-on:transit-dismissed:${userId}`;

function readDismissed(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(getKey(userId)) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    // 저장소를 못 읽으면(사생활 보호 모드 등) 닫은 게 없는 것으로 봐요.
    return [];
  }
}

/**
 * 07a 경유 감지 안내에서 [도시로 둘게요]로 닫은 지점을 기억하는 훅이에요.
 *
 * const [dismissedIds, dismiss] = useDismissedTransits();
 *
 * 의도:
 *  - "도시가 맞다"는 보정 종류에 없어서 서버 대신 이 브라우저에 계정별로 남겨요. 다른 기기에서는 안내가 다시 떠요.
 *  - 지점 ID(첫 사진 ID)로 기억해요. 사진을 더 올려 지점이 바뀌면 다시 물어봐요.
 *  - 저장소에 못 써도 이 화면에 있는 동안은 닫혀 있어요.
 *
 * @returns {[string[], (stopId: string) => void]}
 */
export function useDismissedTransits() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [dismissedIds, setDismissedIds] = useState(() => readDismissed(userId));

  const dismiss = (stopId) => {
    const next = [...dismissedIds, stopId];
    setDismissedIds(next);
    try {
      localStorage.setItem(getKey(userId), JSON.stringify(next));
    } catch {
      // 못 쓰면 이 화면에서만 닫혀요.
    }
  };

  return [dismissedIds, dismiss];
}
