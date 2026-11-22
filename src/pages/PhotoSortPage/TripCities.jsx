import { Fragment } from 'react';

import { cn } from '@/utils/cn';

/**
 * 07a 여행 줄의 도시 칩이에요. 지점마다 하나씩 머문 날 수와 함께 그리고, 사이를 짧은 선으로 이어요.
 *
 * 호출: TripRow가 가운데 칸에 그려요.
 * <TripCities cities={trip.cities} />
 *
 * 의도:
 *  - 도시가 많으면 다음 줄로 넘어가요.
 *  - 경유 지점은 지도의 선과 통계에서 빠지지만 칩은 흐린 점선으로 남겨요. 어디를 경유로 표시했는지 보여야
 *    되돌릴 수 있어서예요(TripRow의 [경유 취소]). 머문 날로 세지 않아서 날 수 대신 "경유"라고 적어요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortCityChip[]} props.cities
 */
export default function TripCities({ cities }) {
  return (
    <ul aria-label="도시" className="flex flex-wrap items-center gap-y-2">
      {cities.map((city, index) => (
        <Fragment key={city.id}>
          {index > 0 && <li aria-hidden="true" className="h-px w-4.5 bg-ink/40" />}
          <li
            className={cn(
              'flex items-baseline gap-1 border px-3 py-2 whitespace-nowrap',
              city.isTransit ? 'border-dashed border-dash' : 'border-line bg-white',
            )}
          >
            <span className={cn('text-sm font-medium', city.isTransit ? 'text-dim' : 'text-ink')}>
              {city.city}
            </span>
            <span className={cn('text-2xs', city.isTransit ? 'text-dim' : 'text-muted')}>
              {city.isTransit ? '경유' : `${city.days}일`}
            </span>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
