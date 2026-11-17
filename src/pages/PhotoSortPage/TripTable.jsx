import NoTripsNotice from '@/components/common/NoTripsNotice';

import { SECTION_CLASS, TRIP_ROW_GRID_CLASS } from './sectionClass';
import TripRow from './TripRow';

const COLUMN_LABEL_CLASS = 'font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase';

/**
 * 07a 여행 묶음 표예요. 머리 줄(TRIP · CITIES · PHOTOS) 아래로 여행을 시간 순서대로 그려요.
 *
 * 호출: PhotoSortPage가 여행 탭에서 그려요.
 * <TripTable trips={trips} canRename onRename={handleRename} />
 *
 * 의도: 여행이 하나도 없으면 고칠 게 없어서 03 · 01과 같은 안내로 사진 올리기에 보내요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow[]} props.trips
 * @param {boolean} props.canRename
 * @param {(tripId: string, name: string) => Promise<unknown>} props.onRename
 */
export default function TripTable({ trips, canRename, onRename }) {
  if (trips.length === 0) {
    return (
      <div className={`${SECTION_CLASS} flex justify-center pt-12`}>
        <NoTripsNotice />
      </div>
    );
  }

  return (
    <section aria-label="여행 묶음" className={`${SECTION_CLASS} pt-12`}>
      <div aria-hidden="true" className={`${TRIP_ROW_GRID_CLASS} border-b border-line pb-3`}>
        <span className={COLUMN_LABEL_CLASS}>Trip</span>
        <span className={COLUMN_LABEL_CLASS}>Cities</span>
        <span className={COLUMN_LABEL_CLASS}>Photos</span>
      </div>
      <ul>
        {trips.map((trip) => (
          <TripRow
            key={trip.id}
            trip={trip}
            canRename={canRename}
            onRename={(name) => onRename(trip.id, name)}
          />
        ))}
      </ul>
    </section>
  );
}
