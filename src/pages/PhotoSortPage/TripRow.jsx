import { Fragment } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';
import { useInView } from '@/hooks/useInView';

import { TRIP_ROW_GRID_CLASS } from './sectionClass';
import TripName from './TripName';

/**
 * 07a 여행 표의 줄 하나예요. 번호 · 이름 ✎ · 기간 | 도시 칩(머문 날 수) | 썸네일 3장 · 장수.
 *
 * 호출: TripTable이 여행마다 그려요.
 * <TripRow trip={trip} canRename onRename={(name) => handleRename(trip.id, name)} />
 *
 * 의도:
 *  - 도시 칩은 03 도시 블록처럼 경유 지점을 빼고 지점마다 하나씩, 사이를 짧은 선으로 이어요. 도시가 많으면 다음 줄로 넘어가요.
 *  - 썸네일은 줄이 화면 가까이 왔을 때 그려요(useInView). 그 전에는 같은 크기의 회색 칸이에요.
 *  - 피그마의 체크박스(합치기 C106) · ✂(나누기 C105) · ⋯(사진 빼기)는 다음 작업에서 붙여요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow} props.trip
 * @param {boolean} props.canRename
 * @param {(name: string) => Promise<unknown>} props.onRename
 */
export default function TripRow({ trip, canRename, onRename }) {
  const { ref: thumbsRef, isInView } = useInView();

  return (
    <li className={`${TRIP_ROW_GRID_CLASS} items-center border-b border-line py-6`}>
      <div className="flex flex-col gap-1">
        <TripName no={trip.no} name={trip.name} canRename={canRename} onRename={onRename} />
        <p className="font-serif text-xs font-bold tracking-[0.2em] text-muted">{trip.dateRange}</p>
      </div>

      <ul aria-label="도시" className="flex flex-wrap items-center gap-y-2">
        {trip.cities.map((city, index) => (
          <Fragment key={city.id}>
            {index > 0 && <li aria-hidden="true" className="h-px w-4.5 bg-ink/40" />}
            <li className="flex items-baseline gap-1 border border-line bg-white px-3 py-2 whitespace-nowrap">
              <span className="text-sm font-medium text-ink">{city.city}</span>
              <span className="text-2xs text-muted">{city.days}일</span>
            </li>
          </Fragment>
        ))}
      </ul>

      <div ref={thumbsRef} className="flex items-center gap-1">
        {trip.thumbs.map((photo) => (
          <div key={photo.id} className="w-11">
            {isInView ? (
              <PhotoGridCell fileKey={photo.fileKey} index={0} />
            ) : (
              <div className="aspect-square bg-line" />
            )}
          </div>
        ))}
        <p className="ml-3 text-sm font-bold text-muted">
          <span className="font-serif">{trip.photoCount.toLocaleString('en-US')}</span>장
        </p>
      </div>
    </li>
  );
}
