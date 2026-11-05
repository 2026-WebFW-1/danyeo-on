import { PERIODS } from '@/constants/journey';
import { cn } from '@/utils/cn';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 왼쪽 위의 1Y · 2Y · ALL 탭
 *
 * 책임: 고른 기간을 강조하고, 누르면 onSelect로 알립니다. 주소를 바꾸는 건 MapPage가 합니다.
 * 호출: MapPage
 *
 * @param {object} props
 * @param {'1y' | '2y' | 'all'} props.period
 * @param {(period: '1y' | '2y' | 'all') => void} props.onSelect
 */
export default function PeriodTabs({ period, onSelect }) {
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
          onClick={() => onSelect(item)}
          className={cn(
            'px-4 py-2 font-serif text-xs font-bold tracking-[0.2em] text-muted uppercase',
            item === period && 'bg-nav text-white',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
