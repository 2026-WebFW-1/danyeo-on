import { useEffect, useState } from 'react';

import { getJourney } from '@/services/journeyService';
import { useAuthStore } from '@/stores/authStore';

const LOADING = { journey: null, status: 'loading', error: null };

/**
 * 로그인한 계정의 여행 데이터(Journey)를 주는 훅이에요. 00·01·02·03 화면이 이걸로 데이터를 받아요.
 * Supabase journeys 테이블에서 로그인한 계정의 행을 읽어요(journeyService).
 *
 * const { journey, status, error } = useJourney();
 * if (status === 'loading') return <로딩 />;
 * if (status === 'error') return <오류 />;
 *
 * 여러 화면에서 불러도 돼요. 데이터는 journeyService가 계정마다 한 번만 읽어 두어서 모두 같은 객체를 받고,
 * 이 훅의 상태는 그 읽기가 끝났는지만 컴포넌트마다 들고 있어요. 그래서 스토어에 두지 않았어요.
 *
 * 오류를 던지지 않아요. 화면이 status를 보고 로딩·오류를 직접 그려요.
 * 계정이 바뀌면 'loading'을 한 번 거쳐 새 계정의 Journey를 줘요. 앞 계정의 Journey는 그 사이에 보이지 않아요.
 * 아직 보정을 저장해도 Journey가 바뀌지 않아요(buildJourney로 다시 계산해 저장하는 일은 따로 해요).
 *
 * @returns {{
 *   journey: import('@/types').Journey | null,
 *   status: 'loading' | 'ready' | 'error',
 *   error: { status: number, code: string, message: string } | null,
 * }}
 *   journey: 'ready'일 때만 있어요. 행이 없는 계정도 'ready'이고 배열은 비고 home·periods는 null이에요
 *   error: 'error'일 때만 있어요. code는 'LOAD_FAILED'예요(읽는 사이 계정이 바뀌면 'ACCOUNT_CHANGED')
 */
export function useJourney() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  // 결과가 어느 계정 것인지 같이 들고 있어서, 계정이 바뀐 직후 앞 계정의 결과를 내보내지 않아요.
  const [result, setResult] = useState({ userId: null, journey: null, error: null });

  useEffect(() => {
    if (!userId) return undefined;
    let isCurrent = true;
    getJourney(userId).then(
      (journey) => isCurrent && setResult({ userId, journey, error: null }),
      (error) => isCurrent && setResult({ userId, journey: null, error }),
    );
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (!userId || result.userId !== userId) return LOADING;
  if (result.error) return { journey: null, status: 'error', error: result.error };
  return { journey: result.journey, status: 'ready', error: null };
}
