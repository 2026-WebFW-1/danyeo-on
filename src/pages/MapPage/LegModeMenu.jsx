import { useEffect, useRef } from 'react';

import { LEG_MODES, MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import { useSaveLegMode } from '@/hooks/useSaveLegMode';
import { cn } from '@/utils/cn';

const MENU_WIDTH = 132;
// 라벨과 메뉴 사이 틈이에요.
const MENU_GAP = 4;
// foreignObject는 넘치는 부분을 잘라서, 세 항목과 안내 두 줄이 들어가는 높이로 넉넉히 잡아요.
const MENU_HEIGHT = 140;

/**
 * 01 고치기 모드에서 구간 라벨을 누르면 라벨 아래에 여는 이동 수단 메뉴예요(기능 명세 M107).
 * 저장은 useSaveLegMode가 해요. 고치기 목록(LegModePanel)과 같은 훅이에요.
 *
 * 호출: LegLabelLayer. <svg> 안에서만 쓸 수 있습니다. 메뉴 디자인은 피그마에 없어서 구간 라벨과 같은 모양으로 둡니다.
 *
 * 의도:
 *  - 보정 목록은 무거운 my_data를 읽어서, 메뉴를 열 때 불러요(useSaveLegMode). 그래서 이 메뉴만 지도 안에서 스토어를 씁니다.
 *  - 지금 이동 수단을 고르면 저장하지 않고 닫아요.
 *  - 실패해도 메뉴를 닫지 않고 안내를 띄워서 다시 고를 수 있게 둬요.
 *  - 메뉴 밖을 누르거나 Esc를 누르면 닫아요. 구간 라벨을 누르는 건 라벨이 열고 닫아서(onOpen) 무시해요.
 *
 * @param {object} props
 * @param {import('@/types').Leg} props.leg canEditLegMode가 true인 구간
 * @param {import('@/utils/legLabels').MapRect} props.rect 그 구간 라벨의 자리
 * @param {(leg: import('@/types').Leg) => void} props.onSaved 저장이 끝나면. 그사이 다른 메뉴를 열었을 수 있어서 구간을 넘겨요
 * @param {() => void} props.onClose
 */
export default function LegModeMenu({ leg, rect, onSaved, onClose }) {
  const { isLoading, hasLoadFailed, savingLegId, failedLegId, save } = useSaveLegMode();
  const menuRef = useRef(null);
  const isSaving = savingLegId !== null;
  const isUnavailable = isLoading || hasLoadFailed;

  useEffect(() => {
    menuRef.current?.querySelector('[aria-checked="true"]')?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (event.target.closest?.('[data-leg-mode-trigger]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  const handleSelect = async (mode) => {
    if (mode === leg.mode) {
      onClose();
      return;
    }
    if (await save(leg, mode)) onSaved(leg);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...menuRef.current.querySelectorAll('[role="menuitemradio"]')];
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = (items.indexOf(document.activeElement) + step + items.length) % items.length;
    items[next].focus();
  };

  return (
    <foreignObject
      x={(rect.left + rect.right - MENU_WIDTH) / 2}
      y={rect.bottom + MENU_GAP}
      width={MENU_WIDTH}
      height={MENU_HEIGHT}
      className="pointer-events-none"
    >
      <div
        ref={menuRef}
        role="menu"
        aria-label="이동 수단 바꾸기"
        aria-busy={isLoading || isSaving}
        onKeyDown={handleKeyDown}
        className="pointer-events-auto flex flex-col border border-ink bg-white py-1 text-2xs text-ink"
      >
        {LEG_MODES.map((mode) => {
          const isCurrent = mode === leg.mode;
          return (
            <button
              key={mode}
              type="button"
              role="menuitemradio"
              aria-checked={isCurrent}
              // disabled면 포커스를 잃어서, 못 누르는 동안에도 aria-disabled로 두고 눌러도 무시해요
              aria-disabled={isUnavailable || isSaving}
              onClick={() => !isUnavailable && !isSaving && handleSelect(mode)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-left hover:bg-paper focus-visible:bg-paper focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-dim',
                isCurrent && 'font-bold',
              )}
            >
              <span aria-hidden="true" className="font-emoji">
                {MODE_EMOJI[mode]}
              </span>
              {MODE_LABEL[mode]}
              {isCurrent && <span className="ml-auto text-muted">지금</span>}
            </button>
          );
        })}
        {hasLoadFailed && (
          <p role="alert" className="px-2 py-1 text-accent">
            보정을 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {failedLegId === leg.id && (
          <p role="alert" className="px-2 py-1 text-accent">
            저장하지 못했어요. 다시 골라 주세요.
          </p>
        )}
      </div>
    </foreignObject>
  );
}
