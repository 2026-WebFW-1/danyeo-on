import { useState } from 'react';

import { useCorrections } from '@/hooks/useCorrections';
import { toModeCorrection } from '@/utils/legMode';

/**
 * 구간의 이동 수단을 고쳐 저장하는 훅이에요. 01의 라벨 메뉴(LegModeMenu)와 고치기 목록(LegModePanel)이 같이 써요.
 * 고르면 보정 { type: 'mode', fromPhotoId, mode }를 저장하고, 스토어가 Journey를 다시 계산해요.
 *
 * 보정을 저장하려면 보정 목록을 먼저 불러와야 해서(useCorrections) 이 훅을 부르면 불러오기를 시작해요.
 * my_data가 무거워서, 지도를 열 때가 아니라 고치기를 시작한 뒤에 그리는 컴포넌트에서만 불러요.
 *
 * @returns {{
 *   isLoading: boolean,
 *   hasLoadFailed: boolean,
 *   savingLegId: string | null,
 *   failedLegId: string | null,
 *   save: (leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => Promise<boolean>,
 * }}
 *   isLoading: 보정을 불러오는 중이라 아직 저장할 수 없어요
 *   hasLoadFailed: 보정을 불러오지 못해서 저장할 수 없어요
 *   savingLegId: 저장 중인 구간. 없으면 null
 *   failedLegId: 마지막으로 저장에 실패한 구간. 다시 저장을 시작하면 지워요
 *   save: 저장하고 성공하면 true. 지금 이동 수단과 같으면 저장하지 않고 true예요
 */
export function useSaveLegMode() {
  const { status, add } = useCorrections();
  const [savingLegId, setSavingLegId] = useState(null);
  const [failedLegId, setFailedLegId] = useState(null);

  const save = async (leg, mode) => {
    if (mode === leg.mode) return true;
    setSavingLegId(leg.id);
    setFailedLegId(null);
    try {
      await add(toModeCorrection(leg, mode));
      return true;
    } catch {
      setFailedLegId(leg.id);
      return false;
    } finally {
      setSavingLegId(null);
    }
  };

  return {
    isLoading: status === 'idle' || status === 'loading',
    hasLoadFailed: status === 'error',
    savingLegId,
    failedLegId,
    save,
  };
}
