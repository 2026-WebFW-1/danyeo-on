import { useEffect, useRef } from 'react';

import { cn } from '@/utils/cn';

import { SECTION_CLASS } from './sectionClass';

/**
 * 여행을 하나 고르는 탭 줄이에요. 번호와 이름이 나란히 있고, 고른 탭은 검정 밑줄이에요.
 *
 * 호출: PlacesView가 여행 목록과 고른 여행의 id를 넘겨서 써요.
 * <TripTabs trips={trips} currentId={current.id} newTripIds={[]} onSelect={handleSelectTrip} />
 *
 * 의도:
 *  - 여행이 많아서(예: 59개) 줄이 넘치면 가로로 스크롤돼요. 고른 탭은 줄의 가운데로 오게 맞춰요.
 *  - 새로 생긴 여행(newTripIds)의 탭에는 NEW 칩을 달아요. 어느 여행이 새것인지는 사진 저장 쪽(#27)이 정해요.
 *  - 탭 이름 색은 피그마가 #8a8a8a인데 토큰에 없어서 가장 가까운 text-dim(#9a9a9a)을 써요.
 *
 * @param {object} props
 * @param {import('@/types').TripListItem[]} props.trips
 * @param {string} props.currentId
 * @param {string[]} props.newTripIds
 * @param {(tripId: string) => void} props.onSelect
 */
export default function TripTabs({ trips, currentId, newTripIds, onSelect }) {
  const scrollerRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector('[aria-current="true"]');
    if (!scroller || !active) return;
    scroller.scrollTo({
      left: active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2,
    });
  }, [currentId]);

  return (
    <nav aria-label="여행 고르기" className={`${SECTION_CLASS} pt-14`}>
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-line" />
        <div ref={scrollerRef} className="relative overflow-x-auto">
          <ul className="relative mx-auto flex w-max">
            {trips.map((trip) => {
              const isActive = trip.id === currentId;
              return (
                <li key={trip.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(trip.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'flex items-baseline gap-2 border-b-2 border-transparent px-7 py-4 whitespace-nowrap',
                      isActive ? 'border-ink text-ink' : 'text-dim hover:text-ink',
                    )}
                  >
                    <span className="font-serif text-sm font-bold">{trip.no}</span>
                    <span
                      className={cn(
                        'text-lg leading-body-lg',
                        isActive ? 'font-medium' : 'font-normal',
                      )}
                    >
                      {trip.name}
                    </span>
                    {newTripIds.includes(trip.id) && (
                      <span className="rounded-pill bg-accent px-1.5 text-2xs font-bold text-white">
                        NEW
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
