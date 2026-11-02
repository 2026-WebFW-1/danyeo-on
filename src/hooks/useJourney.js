import { useEffect, useState } from 'react';

import { getFixtureJourney, personaOf } from '@/services/journeyService';
import { useAuthStore } from '@/stores/authStore';

const LOADING = { journey: null, status: 'loading', error: null };

/**
 * 로그인한 계정의 여행 데이터(Journey)를 주는 훅이에요. 01·02·03 화면이 이걸로 데이터를 받아요.
 * 지금은 픽스처 모드라 로그인한 데모 계정의 fixture를 줘요(journeyService).
 *
 * const { journey, status, error } = useJourney();
 * if (status === 'loading') return <로딩 />;
 * if (status === 'error') return <오류 />;
 *
 * 여러 화면에서 불러도 돼요. 데이터는 journeyService가 인물별로 한 번만 읽어 두어서 모두 같은 객체를 받고,
 * 이 훅의 상태는 그 읽기가 끝났는지만 컴포넌트마다 들고 있어요. 그래서 스토어에 두지 않았어요.
 *
 * 오류를 던지지 않아요. 화면이 status를 보고 로딩·오류를 직접 그려요.
 * 계정이 바뀌면 'loading'을 한 번 거쳐 새 계정의 Journey를 줘요. 앞 계정의 Journey는 그 사이에 보이지 않아요.
 * 픽스처 모드에선 보정을 저장해도 Journey가 바뀌지 않아요.
 *
 * @returns {{
 *   journey: import('@/types').Journey | null,
 *   status: 'loading' | 'ready' | 'error',
 *   error: { status: number, code: string, message: string } | null,
 * }}
 *   journey: 'ready'일 때만 있어요. 빈 계정도 'ready'이고 배열은 비고 periods는 null이에요
 *   error: 'error'일 때만 있어요. fixture가 없으면 code가 'NOT_FOUND'예요
 */
export function useJourney() {
  const persona = useAuthStore((state) => personaOf(state.user));
  // 결과가 어느 인물 것인지 같이 들고 있어서, 계정이 바뀐 직후 앞 계정의 결과를 내보내지 않아요.
  const [result, setResult] = useState({ persona: null, journey: null, error: null });

  useEffect(() => {
    if (!persona) return undefined;
    let isCurrent = true;
    getFixtureJourney(persona).then(
      (journey) => isCurrent && setResult({ persona, journey, error: null }),
      (error) => isCurrent && setResult({ persona, journey: null, error }),
    );
    return () => {
      isCurrent = false;
    };
  }, [persona]);

  if (!persona || result.persona !== persona) return LOADING;
  if (result.error) return { journey: null, status: 'error', error: result.error };
  return { journey: result.journey, status: 'ready', error: null };
}
