import PagedPhotoList from './PagedPhotoList';
import SortPhotoCard from './SortPhotoCard';

/**
 * ⋯로 펼친 여행의 사진 목록이에요. 사진마다 [빼기]가 있어요.
 *
 * 호출: TripRow가 펼쳤을 때 줄 아래에 그려요.
 * <TripPhotos tripName="방콕 · 다낭" photos={trip.photos} canExclude onExclude={handleExclude} />
 *
 * 의도: 뺀 사진은 보정 목록으로 바로 목록에서 빠지고 제외한 사진 탭에 들어가요(selectSortTrips · selectExcludedIds).
 *
 * @param {object} props
 * @param {string} props.tripName
 * @param {import('@/types').PhotoRef[]} props.photos
 * @param {boolean} props.canExclude
 * @param {(photoId: string) => Promise<unknown>} props.onExclude 실패하면 던져요
 */
export default function TripPhotos({ tripName, photos, canExclude, onExclude }) {
  return (
    <div className="border-t border-line bg-paper px-8 py-6">
      <p className="pb-5 text-sm text-muted">
        이 여행이 아닌 사진을 빼면 지도와 기록에서 빠져요. 제외한 사진 탭에서 되돌릴 수 있어요.
      </p>
      <PagedPhotoList
        items={photos}
        label={`${tripName} 사진`}
        renderItem={(photo) => (
          <SortPhotoCard
            key={photo.id}
            fileKey={photo.fileKey}
            actionLabel="빼기"
            workingLabel="빼는 중…"
            failMessage="사진을 빼지 못했어요"
            canAct={canExclude}
            onAction={() => onExclude(photo.id)}
          />
        )}
      />
    </div>
  );
}
