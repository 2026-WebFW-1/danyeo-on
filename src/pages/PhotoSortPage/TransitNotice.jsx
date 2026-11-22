import { useState } from 'react';

import { SECTION_CLASS } from './sectionClass';

/**
 * 07a 경유 감지 안내예요. 경유로 보이는 지점마다 한 줄씩, [경유로 표시]로 transit 보정을 저장해요(C107).
 *
 * 호출: PhotoSortPage가 여행 묶음 탭에서 표 위에 그려요.
 * <TransitNotice trips={trips} canEdit onMark={handleMarkTransit} />
 *
 * 의도:
 *  - 후보(trip.cities의 isTransitCandidate)가 없으면 아무것도 그리지 않아요. 표시하면 보정 목록으로 바로 후보에서
 *    빠져서(selectSortTrips) 그 줄이 사라지고, 표의 도시 칩은 흐린 경유 칩이 돼요.
 *  - 하나씩 보내요. 보내는 동안 다른 줄의 버튼도 막아서, 같은 지점을 두 번 표시하지 않아요.
 *  - 실패하면 그 줄에 안내하고 버튼은 그대로 둬서 다시 누를 수 있어요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow[]} props.trips
 * @param {boolean} props.canEdit 보정을 다 불러왔을 때만 true
 * @param {(city: import('@/utils/photoSort').SortCityChip) => Promise<unknown>} props.onMark 실패하면 던져요
 */
export default function TransitNotice({ trips, canEdit, onMark }) {
  const [sendingId, setSendingId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const candidates = trips.flatMap((trip) =>
    trip.cities.filter((city) => city.isTransitCandidate).map((city) => ({ trip, city })),
  );

  if (candidates.length === 0) return null;

  const handleMark = async (city) => {
    setSendingId(city.id);
    setFailedId(null);
    try {
      await onMark(city);
    } catch (error) {
      console.error(error);
      setFailedId(city.id);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section aria-label="경유 감지 안내" className={`${SECTION_CLASS} pt-10`}>
      <ul className="border border-line bg-white px-8">
        {candidates.map(({ trip, city }) => (
          <li
            key={city.id}
            className="flex items-center justify-between gap-6 border-line py-4 not-first:border-t"
          >
            <div className="flex flex-col gap-1">
              <p className="text-md text-body">
                <strong className="font-bold text-ink">{city.city}</strong>에는 비행기를 갈아타려고
                잠깐 들른 것 같아요. 경유로 표시하면 지도의 선과 여행 기록에서 빠지고 사진은 남아요.
              </p>
              <p className="text-xs text-muted">
                {trip.no} {trip.name}
              </p>
              {failedId === city.id && (
                <p role="alert" className="text-xs text-accent">
                  경유로 표시하지 못했어요. 다시 시도해 주세요.
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label={`${city.city} 경유로 표시`}
              disabled={!canEdit || sendingId !== null}
              onClick={() => handleMark(city)}
              className="shrink-0 bg-ink px-5 py-2.5 text-md font-bold text-white disabled:bg-dim"
            >
              {sendingId === city.id ? '표시하는 중…' : '경유로 표시'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
