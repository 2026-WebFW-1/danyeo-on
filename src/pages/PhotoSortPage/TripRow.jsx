import { useState } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/utils/cn';

import { TRIP_ROW_GRID_CLASS } from './sectionClass';
import TripCities from './TripCities';
import TripName from './TripName';
import TripPhotos from './TripPhotos';
import UndoGroupingButton from './UndoGroupingButton';

/**
 * 07a 여행 표의 줄 하나예요. 번호 · 이름 ✎ · 기간 | 도시 칩(머문 날 수) | 썸네일 3장 · 장수.
 *
 * 호출: TripTable이 여행마다 그려요.
 * <TripRow trip={trip} canEdit onRename={(name) => handleRename(trip, name)} onExclude={handleExclude} onSplit={handleSplit}
 *   onUndoSplit={() => handleUndoSplit(trip)} />
 *
 * 의도:
 *  - 경유로 표시한 지점마다 기간 아래 [도하 경유 취소]가 있어요. 그 지점의 transit 보정을 지워요(#197).
 *  - 썸네일은 줄이 화면 가까이 왔을 때 그려요(useInView). 그 전에는 같은 크기의 회색 칸이에요.
 *  - ⋯를 누르면 줄 아래에 그 여행의 사진을 펼쳐, 사진마다 [빼기]로 빼거나 [여기서 나누기]로 나눌 수 있어요.
 *    펼침은 이 줄에서만 쓰는 값이라 여기 둬요.
 *  - 나눠서 생긴 줄(trip.splitCorrectionIds가 있음)에는 기간 아래 [나누기 취소]가 있어요.
 *  - 이 여행의 이름 바꾸기 · 빼기 · 나누기는 하나씩 보내요. 요청이 끝날 때까지 ✎ · [저장] · 다른 사진 버튼을 막아요.
 *    둘 다 지금 보정으로 입력을 만들어서(buildTripRenameInput · buildTripExcludeInputs), 이름을 옮겨 거는 빼기가 끝나기
 *    전에 새 기준 사진을 빼면 옮긴 걸 모른 채 빼서 이름이 사라져요. 끝나면 보정 목록이 바뀌어 다음 입력은 새 값으로 만들어요.
 *  - 나누기(C105)는 피그마의 줄 ✂ 대신 펼친 사진의 [여기서 나누기]로 해요(#191). 줄 앞 체크박스로 이웃한 두 여행을 골라 합쳐요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').SortTripRow} props.trip
 * @param {boolean} props.isSelected
 * @param {boolean} props.canSelect
 * @param {() => void} props.onSelect
 * @param {boolean} props.canUndoMerge
 * @param {() => Promise<unknown>} props.onUndoMerge
 * @param {boolean} props.canEdit 보정을 다 불러왔을 때만 true. 이름 바꾸기와 사진 빼기를 막아요
 * @param {(name: string) => Promise<unknown>} props.onRename
 * @param {(photoId: string) => Promise<unknown>} props.onExclude
 * @param {(photoId: string) => Promise<unknown>} props.onSplit
 * @param {() => Promise<unknown>} props.onUndoSplit
 * @param {(city: import('@/utils/photoSort').SortCityChip) => Promise<unknown>} props.onUndoTransit
 */
export default function TripRow({
  trip,
  canEdit,
  isSelected,
  canSelect,
  onSelect,
  canUndoMerge,
  onUndoMerge,
  onRename,
  onExclude,
  onSplit,
  onUndoSplit,
  onUndoTransit,
}) {
  const { ref: thumbsRef, isInView } = useInView();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const panelId = `trip-photos-${trip.id}`;
  const canEditNow = canEdit && !isSending;

  // 실패하면 그대로 던져, 누른 칸(TripName · SortPhotoCard)이 안내를 띄워요.
  const sendOne = async (request) => {
    setIsSending(true);
    try {
      return await request();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <li className="border-b border-line">
      <div className={`${TRIP_ROW_GRID_CLASS} items-center py-6`}>
        <input
          type="checkbox"
          aria-label={`${trip.no}번 ${trip.name} 합치기 선택`}
          checked={isSelected}
          disabled={!canSelect || isSending}
          onChange={onSelect}
          className="size-4 accent-ink"
        />
        <div className="flex flex-col gap-1">
          <TripName
            no={trip.no}
            name={trip.name}
            canRename={canEditNow}
            onRename={(name) => sendOne(() => onRename(name))}
          />
          <p className="font-serif text-xs font-bold tracking-[0.2em] text-muted">
            {trip.dateRange}
          </p>
          {trip.splitCorrectionIds.length > 0 && (
            <UndoGroupingButton
              action="나누기"
              canUndo={canEditNow}
              onUndo={() => sendOne(onUndoSplit)}
            />
          )}
          {trip.mergeCorrectionIds.length > 0 && (
            <UndoGroupingButton
              action="합치기"
              canUndo={canUndoMerge && canEditNow}
              onUndo={() => sendOne(onUndoMerge)}
            />
          )}
          {trip.cities
            .filter((city) => city.isTransit)
            .map((city) => (
              <UndoGroupingButton
                key={city.id}
                action={`${city.city} 경유`}
                canUndo={canEditNow}
                onUndo={() => sendOne(() => onUndoTransit(city))}
              />
            ))}
          {trip.isMergingWithPrevious && <p className="text-xs text-muted">앞 여행과 합치는 중…</p>}
        </div>

        <TripCities cities={trip.cities} />

        <div className="flex items-center justify-between">
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
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={`${trip.name} 사진 ${isOpen ? '접기' : '펼치기'}`}
            className={cn(
              'px-1 font-serif text-lg font-bold text-muted hover:text-ink',
              isOpen && 'text-ink',
            )}
          >
            ···
          </button>
        </div>
      </div>

      {isOpen && (
        <div id={panelId}>
          <TripPhotos
            tripName={trip.name}
            photos={trip.photos}
            splittingPhotoIds={trip.splittingPhotoIds}
            canEdit={canEditNow}
            onExclude={(photoId) => sendOne(() => onExclude(photoId))}
            onSplit={(photoId) => sendOne(() => onSplit(photoId))}
          />
        </div>
      )}
    </li>
  );
}
