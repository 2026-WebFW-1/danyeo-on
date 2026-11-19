import { useEffect, useRef } from 'react';

import { LEG_MODES, MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import { cn } from '@/utils/cn';

const MENU_WIDTH = 132;
// 라벨과 메뉴 사이 틈이에요.
const MENU_GAP = 4;
// foreignObject는 넘치는 부분을 잘라서, 세 항목이 들어가는 높이로 넉넉히 잡아요.
const MENU_HEIGHT = 100;

/**
 * 01 고치기 모드에서 구간 라벨을 누르면 라벨 아래에 여는 이동 수단 메뉴예요(기능 명세 M107).
 * 고르면 초안에만 담고 닫아요. 저장은 고치기 목록(LegModePanel)의 완료가 해요.
 *
 * 호출: LegLabelLayer. <svg> 안에서만 쓸 수 있습니다. 메뉴 디자인은 피그마에 없어서 구간 라벨과 같은 모양으로 둡니다.
 *
 * 의도:
 *  - 메뉴 밖을 누르거나 Esc를 누르면 닫아요. 구간 라벨을 누르는 건 라벨이 열고 닫아서(onOpen) 무시해요.
 *  - Esc는 메뉴만 닫고 고치기 모드까지 끝내지 않게 전파를 막아요.
 *
 * @param {object} props
 * @param {import('@/types').Leg} props.leg 초안을 얹은 구간. canEditLegMode가 true예요
 * @param {import('@/utils/legLabels').MapRect} props.rect 그 구간 라벨의 자리
 * @param {(leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => void} props.onSelect
 * @param {() => void} props.onClose
 */
export default function LegModeMenu({ leg, rect, onSelect, onClose }) {
  const menuRef = useRef(null);

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

  const handleSelect = (mode) => {
    if (mode !== leg.mode) onSelect(leg, mode);
    onClose();
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
              onClick={() => handleSelect(mode)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-left hover:bg-paper focus-visible:bg-paper focus-visible:outline-none',
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
      </div>
    </foreignObject>
  );
}
