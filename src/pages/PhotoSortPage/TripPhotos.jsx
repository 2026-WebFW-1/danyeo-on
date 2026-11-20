import PagedPhotoList from './PagedPhotoList';
import SortPhotoCard from './SortPhotoCard';

const PENDING_SPLIT_CAPTION = '여기서 나눠요 · 정리 중';

/**
 * ⋯로 펼친 여행의 사진 목록이에요. 사진마다 [빼기]와 [여기서 나누기]가 있어요.
 *
 * 호출: TripRow가 펼쳤을 때 줄 아래에 그려요.
 * <TripPhotos tripName="방콕 · 다낭" photos={trip.photos} pendingSplitPhotoIds={trip.pendingSplitPhotoIds}
 *   canEdit onExclude={handleExclude} onSplit={handleSplit} />
 *
 * 의도:
 *  - 뺀 사진은 보정 목록으로 바로 목록에서 빠지고 제외한 사진 탭에 들어가요(selectSortTrips · selectExcludedIds).
 *  - 나누기는 Journey를 다시 계산해야 줄이 둘이 돼요. 그동안 나눌 사진에는 [여기서 나누기] 대신 정리 중이라고 적어요.
 *  - 첫 사진 앞에서는 나눌 게 없어서 첫 사진에는 [여기서 나누기]가 없어요.
 *
 * @param {object} props
 * @param {string} props.tripName
 * @param {import('@/types').PhotoRef[]} props.photos
 * @param {string[]} props.pendingSplitPhotoIds
 * @param {boolean} props.canEdit
 * @param {(photoId: string) => Promise<unknown>} props.onExclude 실패하면 던져요
 * @param {(photoId: string) => Promise<unknown>} props.onSplit 실패하면 던져요
 */
export default function TripPhotos({
  tripName,
  photos,
  pendingSplitPhotoIds,
  canEdit,
  onExclude,
  onSplit,
}) {
  const firstPhotoId = photos[0]?.id;

  const buildActions = (photo) => {
    const exclude = {
      label: '빼기',
      workingLabel: '빼는 중…',
      failMessage: '사진을 빼지 못했어요',
      onAction: () => onExclude(photo.id),
    };
    const split = {
      label: '여기서 나누기',
      workingLabel: '나누는 중…',
      failMessage: '여행을 나누지 못했어요',
      onAction: () => onSplit(photo.id),
    };
    const canSplit = photo.id !== firstPhotoId && !pendingSplitPhotoIds.includes(photo.id);
    return canSplit ? [exclude, split] : [exclude];
  };

  return (
    <div className="border-t border-line bg-paper px-8 py-6">
      <p className="pb-5 text-sm text-muted">
        이 여행이 아닌 사진을 빼면 지도와 기록에서 빠져요. 제외한 사진 탭에서 되돌릴 수 있어요.
        [여기서 나누기]를 누르면 그 사진부터 새 여행이 돼요.
      </p>
      <PagedPhotoList
        items={photos}
        label={`${tripName} 사진`}
        renderItem={(photo) => (
          <SortPhotoCard
            key={photo.id}
            fileKey={photo.fileKey}
            caption={pendingSplitPhotoIds.includes(photo.id) ? PENDING_SPLIT_CAPTION : undefined}
            canAct={canEdit}
            actions={buildActions(photo)}
          />
        )}
      />
    </div>
  );
}
