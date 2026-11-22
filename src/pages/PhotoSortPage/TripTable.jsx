import { useState } from 'react';

import NoTripsNotice from '@/components/common/NoTripsNotice';

import { buildTripMergeInput } from '@/utils/photoSort';

import { SECTION_CLASS, TRIP_ROW_GRID_CLASS } from './sectionClass';
import TripRow from './TripRow';

const COLUMN_LABEL_CLASS = 'font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase';

/**
 * 07a 여행 묶음 표예요. 머리 줄(TRIP · CITIES · PHOTOS) 아래로 여행을 시간 순서대로 그려요.
 *
 * 호출: PhotoSortPage가 여행 탭에서 그려요.
 * <TripTable trips={trips} canEdit onRename={handleRename} onExclude={handleExclude} onSplit={handleSplit}
 *   onUndoSplit={handleUndoSplit} />
 *
 * 의도: 여행이 하나도 없으면 고칠 게 없어서 03 · 01과 같은 안내로 사진 올리기에 보내요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow[]} props.trips
 * @param {boolean} props.canMerge 보정과 여행 계산이 모두 준비됐는지
 * @param {(input: import('@/types').CorrectionInput) => Promise<unknown>} props.onMerge
 * @param {(trip: import('@/utils/photoSort').SortTripRow) => Promise<unknown>} props.onUndoMerge
 * @param {boolean} props.canEdit
 * @param {(trip: import('@/utils/photoSort').SortTripRow, name: string) => Promise<unknown>} props.onRename
 * @param {(trip: import('@/utils/photoSort').SortTripRow, photoId: string) => Promise<unknown>} props.onExclude
 * @param {(photoId: string) => Promise<unknown>} props.onSplit 이 사진부터 새 여행으로 나눠요
 * @param {(trip: import('@/utils/photoSort').SortTripRow) => Promise<unknown>} props.onUndoSplit
 */
export default function TripTable({
  trips,
  canEdit,
  canMerge,
  onMerge,
  onUndoMerge,
  onRename,
  onExclude,
  onSplit,
  onUndoSplit,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  // 표 순서로 골라야 아래 줄을 먼저 눌러도 기준 사진의 앞뒤가 맞아요.
  const selected = trips.filter((trip) => selectedIds.includes(trip.id));
  const input = selected.length === 2 ? buildTripMergeInput(...selected) : null;
  const canChange = canMerge && !isSaving;

  const canSelect = (trip, index) => {
    if (!canChange) return false;
    if (selected.some((row) => row.id === trip.id)) return true;
    if (selected.length === 0)
      return Boolean(trip.mergeWithPreviousId || trips[index + 1]?.mergeWithPreviousId === trip.id);
    return (
      selected.length === 1 &&
      (trip.mergeWithPreviousId === selected[0].id || selected[0].mergeWithPreviousId === trip.id)
    );
  };

  const toggle = (id) => {
    setHasFailed(false);
    const ids = selected.map((row) => row.id);
    setSelectedIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  const handleMerge = async () => {
    if (!input || !canChange) return;
    setIsSaving(true);
    setHasFailed(false);
    try {
      await onMerge(input);
      setSelectedIds([]);
    } catch {
      setHasFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (trips.length === 0) {
    return (
      <div className={`${SECTION_CLASS} flex justify-center pt-12`}>
        <NoTripsNotice />
      </div>
    );
  }

  return (
    <section aria-label="여행 묶음" className={`${SECTION_CLASS} pt-12`}>
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!canChange || !input}
          onClick={handleMerge}
          className="border border-line px-3 py-2 text-sm font-bold text-ink disabled:text-dim"
        >
          {isSaving ? '합치는 중…' : '합치기'}
        </button>
        {hasFailed && (
          <p role="alert" className="text-xs text-accent">
            여행을 합치지 못했어요. 다시 시도해 주세요.
          </p>
        )}
      </div>
      <div aria-hidden="true" className={`${TRIP_ROW_GRID_CLASS} border-b border-line pb-3`}>
        <span />
        <span className={COLUMN_LABEL_CLASS}>Trip</span>
        <span className={COLUMN_LABEL_CLASS}>Cities</span>
        <span className={COLUMN_LABEL_CLASS}>Photos</span>
      </div>
      <ul>
        {trips.map((trip, index) => (
          <TripRow
            key={trip.id}
            trip={trip}
            canEdit={canEdit && !isSaving}
            isSelected={selectedIds.includes(trip.id)}
            canSelect={canSelect(trip, index)}
            onSelect={() => toggle(trip.id)}
            canUndoMerge={canChange}
            onUndoMerge={() => onUndoMerge(trip)}
            onRename={(name) => onRename(trip, name)}
            onExclude={(photoId) => onExclude(trip, photoId)}
            onSplit={onSplit}
            onUndoSplit={() => onUndoSplit(trip)}
          />
        ))}
      </ul>
    </section>
  );
}
