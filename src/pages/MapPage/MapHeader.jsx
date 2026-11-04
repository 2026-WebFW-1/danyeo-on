import { cn } from '@/utils/cn';
import { formatPeriodRange } from '@/utils/mapScreen';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 지도 위 가운데의 제목과 기간
 *
 * 호출: MapPage
 *
 * @param {object} props
 * @param {{ from: string, to: string }} props.range 지금 고른 기간
 */
export default function MapHeader({ range }) {
  return (
    <header
      className={cn(
        'absolute top-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 px-10 py-5 whitespace-nowrap',
        PANEL_STYLE,
      )}
    >
      <h1 className="font-serif text-5xl font-bold tracking-[-0.02em] text-nav">My Journey</h1>
      <p className="text-lg leading-body-lg text-muted">{formatPeriodRange(range)}</p>
    </header>
  );
}
