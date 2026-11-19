import { useCallback, useMemo, useState } from 'react';

const NO_MODES = {};

/**
 * 01 고치기 모드에서 고른 이동 수단을 저장하기 전까지 들고 있는 초안이에요.
 * 고치기 목록(LegModePanel)과 라벨 메뉴(LegModeMenu)가 여기에 고르고, 완료를 눌러야 목록이 한꺼번에 저장해요.
 *
 * 초안은 그 legs에 붙어 있어요. legs가 바뀌면(기간 바꾸기, 저장 뒤 Journey 다시 계산) 초안은 저절로 비어요.
 * 그래서 완료한 뒤 Journey를 다시 계산하는 동안에도 고른 수단이 보이고, 새 Journey가 오면 그 값으로 바뀌어요.
 * effect로 비우면 한 번은 옛 초안으로 그려져서, 초안을 만든 legs를 같이 기억해 두고 비교해요.
 *
 * @param {import('@/types').Leg[]} legs 저장된 구간
 * @returns {{
 *   displayLegs: import('@/types').Leg[],
 *   changes: { leg: import('@/types').Leg, mode: import('@/types').Leg['mode'] }[],
 *   setMode: (leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => void,
 *   clear: () => void,
 * }}
 *   displayLegs: 초안을 얹은 구간. 지도와 목록에 그려요. 바꾼 구간은 modeSource가 'user'예요
 *   changes: 저장할 것. leg는 저장된 구간이에요. 시간 순서
 *   setMode: 고르기. 저장된 수단으로 되돌리면 초안에서 빠져요
 *   clear: 초안 버리기
 */
export function useLegModeDraft(legs) {
  const [draft, setDraft] = useState({ legs, modes: NO_MODES });
  const modes = draft.legs === legs ? draft.modes : NO_MODES;

  const displayLegs = useMemo(
    () =>
      modes === NO_MODES
        ? legs
        : legs.map((leg) =>
            leg.id in modes ? { ...leg, mode: modes[leg.id], modeSource: 'user' } : leg,
          ),
    [legs, modes],
  );

  const changes = useMemo(
    () => legs.filter((leg) => leg.id in modes).map((leg) => ({ leg, mode: modes[leg.id] })),
    [legs, modes],
  );

  const setMode = useCallback(
    (leg, mode) => {
      setDraft((prev) => {
        const next = { ...(prev.legs === legs ? prev.modes : NO_MODES) };
        // 초안을 얹은 구간이 올 수 있어서, 저장된 구간과 비교해요.
        const savedMode = legs.find((item) => item.id === leg.id)?.mode;
        if (mode === savedMode) delete next[leg.id];
        else next[leg.id] = mode;
        return { legs, modes: Object.keys(next).length === 0 ? NO_MODES : next };
      });
    },
    [legs],
  );

  const clear = useCallback(() => setDraft({ legs, modes: NO_MODES }), [legs]);

  return { displayLegs, changes, setMode, clear };
}
