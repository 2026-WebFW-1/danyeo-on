import { cn } from '@/utils/cn';
import { formatPeriodRange, formatTripRange } from '@/utils/mapScreen';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 지도 위 가운데의 제목과 기간
 *
 * 호출: MapPage
 *
 * @param {object} props
 * @param {{ from: string, to: string }} props.range 지금 고른 기간
 * @param {import('@/types').Trip | null} props.trip 한 여행만 재생할 때 그 여행. 있으면 기간 대신 여행 이름과 날짜를 보여 줘요
 */
export default function MapHeader({ range, trip }) {
  return (
    <header
      className={cn(
        'absolute top-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 px-10 py-5 whitespace-nowrap',
        PANEL_STYLE,
      )}
    >
      <h1 className="font-serif text-5xl font-bold tracking-[-0.02em] text-nav">My Journey</h1>
      {trip ? (
        <>
          <p className="text-lg font-bold text-nav">{trip.name}</p>
          <p className="text-md leading-body-md text-muted">{formatTripRange(trip)}</p>
        </>
      ) : (
        <p className="text-lg leading-body-lg text-muted">{formatPeriodRange(range)}</p>
      )}
    </header>
  );
}
