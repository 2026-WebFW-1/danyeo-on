import { useState } from 'react';

import { clearMyPhotos } from '@/services/myPhotosService';
import { deletePhotos } from '@/services/photoService';
import { formatDateRange } from '@/utils/formatDateRange';

import ExcludedPhotoRow from './ExcludedPhotoRow';
import PagedPhotoList from './PagedPhotoList';
import { COLUMN_LABEL_CLASS, EXCLUDED_ROW_GRID_CLASS, SECTION_CLASS } from './sectionClass';

const DELETE_CONFIRM = {
  title: '다녀온에서 이 사진을 영구 삭제할까요?',
  description: '삭제 후에는 복구할 수 없어요.',
  confirmLabel: '영구 삭제',
};

/**
 * 제외한 사진 탭이에요. 뺀 사진을 최근에 뺀 순서로 보여 주고, 사진마다 [복구] · [영구 삭제]가 있어요.
 *
 * 호출: PhotoSortPage가 ?tab=excluded일 때 그려요.
 * <ExcludedTab photos={excludedPhotos} status={correctionStatus} canEdit onRestore={handleRestore}
 *   onBeforeDelete={handleMoveAnchors} onDeleted={handleRestore} />
 *
 * 의도:
 *  - [복구]는 그 사진의 exclude 보정을 모두 지워요. 서버가 사진마다 하나만 저장하지만(BE #8) 둘이 남아 있어도 복구되게요.
 *  - 복구한 사진은 바로 이 목록에서 빠지고, 여행 묶음에는 Journey를 다시 계산한 뒤 돌아와요.
 *  - 피그마에 이 탭의 디자인이 없어서 07a 여행 표처럼 사진 한 장을 한 줄로 그리고, 버튼은 줄 오른쪽 끝에 둬요(ExcludedPhotoRow).
 *  - 목록은 보정에서 만들어서, 보정을 다 불러오기 전에는 그리지 않아요.
 *  - [영구 삭제]는 되돌릴 수 없어서 확인 창으로 한 번 묻고(#207 글 지우기와 같아요), 그 사진 한 장만 지워요.
 *    묻는 것은 줄(ExcludedPhotoRow)이 맡고, 확인했을 때만 여기의 지우기를 불러요(#282).
 *    지우기 전에 onBeforeDelete로 그 사진에 건 split · merge 기준을 옮겨요. 사진과 함께 연결이 지워지면 나눈 여행이
 *    다시 붙거나 합친 여행이 다시 갈라져서예요. 옮기기가 실패하면 사진을 지우지 않아요.
 *    사진을 지우지 못하면 옮긴 기준을 되돌려요. 옮긴 채 [복구]하면 나눈 자리가 옮긴 사진으로 바뀌어 있어서예요.
 *    사진을 지워도 exclude 보정은 사진 없이 남아서, 지운 뒤 onDeleted로 그 exclude를 지우고 Journey를 다시 계산해요.
 *    exclude 지우기가 실패하면 다시 눌러요. 이미 지운 사진은 deletePhotos가 오류 없이 건너뛰어 exclude만 다시 지워요.
 *  - 한 장을 지우는 동안 다른 사진의 [영구 삭제]를 막아요. 기준 옮기기는 아직 목록에 있는 사진으로 고르는데,
 *    지우는 중인 사진으로 옮기면 그 사진이 지워질 때 옮긴 연결도 같이 지워져 나눈 여행이 다시 붙어서예요.
 *    지우는 중인 사진은 여러 칸이 같이 봐야 해서 이 탭에 둬요.
 *    deletePhotos가 0행을 지워도 exclude를 지워요. photos의 RLS는 읽기·지우기가 같은 "본인 사진" 조건이고
 *    exclude는 본인 사진에만 걸려서, 0행이면 이미 지워진 사진이에요(남은 사진이 다시 여행에 돌아가는 일은 없어요).
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').ExcludedPhoto[]} props.photos
 * @param {'idle' | 'loading' | 'ready' | 'error'} props.status 보정 불러오기 상태
 * @param {boolean} props.canEdit 사진을 모두 지우는 중이면 false예요(#284). [복구] · [영구 삭제]를 막아요
 * @param {(photo: import('@/utils/photoSort').ExcludedPhoto) => Promise<unknown>} props.onRestore 실패하면 던져요
 * @param {(photo: import('@/utils/photoSort').ExcludedPhoto) => Promise<() => Promise<unknown>>} props.onBeforeDelete
 *   지우기 전에 split · merge 기준을 옮기고, 옮긴 것을 되돌리는 함수를 돌려줘요. 실패하면 던져요
 * @param {(photo: import('@/utils/photoSort').ExcludedPhoto) => Promise<unknown>} props.onDeleted 사진을 지운 뒤 그 exclude를 지워요. 실패하면 던져요
 */
export default function ExcludedTab({
  photos,
  status,
  canEdit,
  onRestore,
  onBeforeDelete,
  onDeleted,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const deletePhoto = async (photo) => {
    const undoMoves = await onBeforeDelete(photo);
    try {
      await deletePhotos([photo.id]);
    } catch (error) {
      // 되돌리기가 실패해도 안내는 사진을 지우지 못한 것으로 해요. 다시 누르면 지금 보정으로 다시 옮겨요.
      await undoMoves().catch((undoError) => console.error(undoError));
      throw error;
    }
    // 사진 목록은 Journey를 다 계산한 뒤(20초쯤)에야 다시 읽어요. 그 전에 다른 사진을 지우면 지운 사진을 기준으로
    // 골라 옮기다 실패해서, 지금 바로 다시 읽게 해요.
    clearMyPhotos();
    await onDeleted(photo);
  };

  const handleDelete = async (photo) => {
    setDeletingId(photo.id);
    try {
      await deletePhoto(photo);
    } finally {
      setDeletingId(null);
    }
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
      <div aria-hidden="true" className={`${EXCLUDED_ROW_GRID_CLASS} border-b border-line pb-3`}>
        <span className={COLUMN_LABEL_CLASS}>Photo</span>
        <span className={COLUMN_LABEL_CLASS}>Taken</span>
      </div>
      <PagedPhotoList
        items={photos}
        label="뺀 사진"
        className="flex flex-col gap-0"
        renderItem={(photo) => (
          <ExcludedPhotoRow
            key={photo.id}
            fileKey={photo.fileKey}
            date={photo.takenAt ? formatDateRange(photo.takenAt, photo.takenAt) : null}
            canAct={canEdit}
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
                disabled: deletingId !== null && deletingId !== photo.id,
                confirm: DELETE_CONFIRM,
                onAction: () => handleDelete(photo),
              },
            ]}
          />
        )}
      />
    </section>
  );
}
