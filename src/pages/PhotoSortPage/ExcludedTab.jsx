import { deletePhotos } from '@/services/photoService';
import { formatDateRange } from '@/utils/formatDateRange';

import PagedPhotoList from './PagedPhotoList';
import { SECTION_CLASS } from './sectionClass';
import SortPhotoCard from './SortPhotoCard';

/**
 * 제외한 사진 탭이에요. 뺀 사진을 최근에 뺀 순서로 보여 주고, 사진마다 [복구] · [영구 삭제]가 있어요.
 *
 * 호출: PhotoSortPage가 ?tab=excluded일 때 그려요.
 * <ExcludedTab photos={excludedPhotos} status={correctionStatus} onRestore={handleRestore} onDeleted={handleRestore} />
 *
 * 의도:
 *  - [복구]는 그 사진의 exclude 보정을 모두 지워요. 같은 사진의 exclude가 둘일 수 있어서예요(BE #8).
 *  - 복구한 사진은 바로 이 목록에서 빠지고, 여행 묶음에는 Journey를 다시 계산한 뒤 돌아와요.
 *  - 피그마에 이 탭의 디자인이 없어서 07b의 사진 칸(128px)과 같은 크기로 그려요.
 *  - 목록은 보정에서 만들어서, 보정을 다 불러오기 전에는 그리지 않아요.
 *  - [영구 삭제]는 되돌릴 수 없어서 window.confirm으로 한 번 묻고(#207 글 지우기와 같아요), 그 사진 한 장만 지워요.
 *    사진을 지워도 exclude 보정은 사진 없이 남아서, 지운 뒤 onDeleted로 그 exclude를 지우고 Journey를 다시 계산해요.
 *    exclude 지우기가 실패하면 다시 눌러요. 이미 지운 사진은 deletePhotos가 오류 없이 건너뛰어 exclude만 다시 지워요.
 *    deletePhotos가 0행을 지워도 exclude를 지워요. photos의 RLS는 읽기·지우기가 같은 "본인 사진" 조건이고
 *    exclude는 본인 사진에만 걸려서, 0행이면 이미 지워진 사진이에요(남은 사진이 다시 여행에 돌아가는 일은 없어요).
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').ExcludedPhoto[]} props.photos
 * @param {'idle' | 'loading' | 'ready' | 'error'} props.status 보정 불러오기 상태
 * @param {(photo: import('@/utils/photoSort').ExcludedPhoto) => Promise<unknown>} props.onRestore 실패하면 던져요
 * @param {(photo: import('@/utils/photoSort').ExcludedPhoto) => Promise<unknown>} props.onDeleted 사진을 지운 뒤 그 exclude를 지워요. 실패하면 던져요
 */
export default function ExcludedTab({ photos, status, onRestore, onDeleted }) {
  const handleDelete = async (photo) => {
    if (!window.confirm('다녀온에서 이 사진을 영구 삭제할까요? 삭제 후에는 복구할 수 없어요.')) return;
    await deletePhotos([photo.id]);
    await onDeleted(photo);
  };

  // 불러오기 실패 안내는 PhotoSortPage가 탭 위에 띄워요.
  if (status === 'error') return null;

  if (status !== 'ready') {
    return (
      <p role="status" className={`${SECTION_CLASS} pt-12 text-center text-lg text-muted`}>
        뺀 사진을 불러오는 중이에요
      </p>
    );
  }

  if (photos.length === 0) {
    return (
      <p className={`${SECTION_CLASS} pt-12 text-center text-lg leading-body-lg text-muted`}>
        뺀 사진이 없어요. 여행 묶음에서 ⋯를 눌러 여행이 아닌 사진을 뺄 수 있어요.
      </p>
    );
  }

  return (
    <section aria-label="제외한 사진" className={`${SECTION_CLASS} pt-12`}>
      <p className="pb-8 text-md leading-body-md text-body">
        뺀 사진은 지도와 기록에 나오지 않아요. [복구]하면 다시 여행에 들어가요.
      </p>
      <PagedPhotoList
        items={photos}
        label="뺀 사진"
        className="grid-cols-[repeat(auto-fill,8rem)] gap-x-4"
        renderItem={(photo) => (
          <SortPhotoCard
            key={photo.id}
            fileKey={photo.fileKey}
            caption={photo.takenAt ? formatDateRange(photo.takenAt, photo.takenAt) : '날짜 없음'}
            canAct
            actions={[
              {
                label: '복구',
                workingLabel: '복구하는 중…',
                failMessage: '복구하지 못했어요',
                onAction: () => onRestore(photo),
              },
              {
                label: '영구 삭제',
                workingLabel: '삭제하는 중…',
                failMessage: '사진을 지우지 못했어요. 다시 눌러 주세요',
                onAction: () => handleDelete(photo),
              },
            ]}
          />
        )}
      />
    </section>
  );
}
