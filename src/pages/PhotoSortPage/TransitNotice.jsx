import { useState } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';
import { SORT_THUMB_COUNT } from '@/constants/photoSort';
import { useDismissedTransits } from '@/hooks/useDismissedTransits';
import { formatDateRange } from '@/utils/formatDateRange';
import { formatStay } from '@/utils/transitCandidates';

import { SECTION_CLASS } from './sectionClass';

/**
 * 07a 경유 감지 안내(CHECK 배너)예요. 경유로 보이는 지점마다 상자 하나씩 물어봐요(C107).
 *
 * 호출: PhotoSortPage가 여행 묶음 탭에서 표 위에 그려요.
 * <TransitNotice trips={trips} canEdit onMark={handleMarkTransit} />
 *
 * 의도:
 *  - 후보(trip.cities의 isTransitCandidate)가 없으면 아무것도 그리지 않아요.
 *  - [경유로 처리]는 transit 보정을 저장해요. 저장되면 보정 목록으로 바로 후보에서 빠져서(selectSortTrips) 상자가
 *    사라지고, 표의 도시 칩은 흐린 경유 칩이 돼요. 하나씩 보내고, 보내는 동안 다른 상자의 버튼도 막아요.
 *  - [도시로 둘게요]는 저장하는 보정이 없어서 이 브라우저에만 기억해요(useDismissedTransits).
 *  - 피그마 제목은 공항 이름("인천공항에서 찍은…")이지만 공항 이름은 받아 두지 않아서 지점의 도시 이름을 써요.
 *
 * 피그마 07a callout 경유 감지: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=39-49
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow[]} props.trips
 * @param {boolean} props.canEdit 보정을 다 불러왔을 때만 true
 * @param {(city: import('@/utils/photoSort').SortCityChip) => Promise<unknown>} props.onMark 실패하면 던져요
 */
export default function TransitNotice({ trips, canEdit, onMark }) {
  const [dismissedIds, dismiss] = useDismissedTransits();
  const [sendingId, setSendingId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const candidates = trips
    .flatMap((trip) => trip.cities)
    .filter((city) => city.isTransitCandidate && !dismissedIds.includes(city.id));

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
      <ul className="flex flex-col gap-3">
        {candidates.map((city) => (
          <li
            key={city.id}
            className="flex items-center gap-7 border border-l-3 border-accent bg-white px-7 py-6"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="font-serif text-xs font-bold tracking-[0.2em] text-accent uppercase">
                Check
              </p>
              <p className="text-xl font-bold text-ink">
                {city.city}에서 찍은 사진 {city.photos.length}장이 도시로 잡혔어요
              </p>
              <p className="text-md leading-body-md text-muted">
                {formatDateRange(city.from, city.from)} · {formatStay(city.from, city.to)}. 환승
                중이었다면 경유로 처리하고 선에서 빼 둘게요.
              </p>
              {failedId === city.id && (
                <p role="alert" className="text-xs text-accent">
                  경유로 처리하지 못했어요. 다시 시도해 주세요.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {city.photos.slice(0, SORT_THUMB_COUNT).map((photo) => (
                <div key={photo.id} className="w-13">
                  <PhotoGridCell fileKey={photo.fileKey} index={0} />
                </div>
              ))}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={`${city.city} 경유로 처리`}
                disabled={!canEdit || sendingId !== null}
                onClick={() => handleMark(city)}
                className="bg-ink px-5 py-3 text-md font-bold text-white disabled:bg-dim"
              >
                {sendingId === city.id ? '처리하는 중…' : '경유로 처리'}
              </button>
              <button
                type="button"
                aria-label={`${city.city} 도시로 둘게요`}
                disabled={sendingId !== null}
                onClick={() => dismiss(city.id)}
                className="border border-ink bg-white px-5 py-3 text-md font-bold text-ink disabled:border-dim disabled:text-dim"
              >
                도시로 둘게요
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
