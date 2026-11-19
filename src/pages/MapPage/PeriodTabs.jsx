import { PERIODS } from '@/constants/journey';
import { cn } from '@/utils/cn';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 왼쪽 위의 1Y · 2Y · ALL 탭
 *
 * 책임: 고른 기간을 강조하고, 누르면 onSelect로 알립니다. 주소를 바꾸는 건 MapPage가 합니다.
 * 호출: MapPage
 *
 * 의도: 여행이 없는 계정(15a)은 고를 기간이 없어서 disabled로 세 탭을 흐리게 두고 누를 수 없게 해요.
 *
 * @param {object} props
 * @param {'1y' | '2y' | 'all' | null} props.period 한 여행만 재생할 때는 null이라 어느 탭도 강조하지 않아요
 * @param {(period: '1y' | '2y' | 'all') => void} props.onSelect
 * @param {boolean} [props.disabled] 여행이 없을 때 true예요
 */
export default function PeriodTabs({ period, onSelect, disabled = false }) {
  return (
    <div
      role="group"
      aria-label="기간"
      className={cn('absolute top-11 left-8 flex gap-0.5 p-1', PANEL_STYLE)}
    >
      {PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={item === period}
          disabled={disabled}
          onClick={() => onSelect(item)}
          className={cn(
            'px-4 py-2 font-serif text-xs font-bold tracking-[0.2em] text-muted uppercase disabled:text-dim',
            item === period && 'bg-nav text-white',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
