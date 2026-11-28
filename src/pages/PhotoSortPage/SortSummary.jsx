import { useState } from 'react';
import { Link } from 'react-router';

import ConfirmDialog from '@/components/common/ConfirmDialog';

import { SECTION_CLASS } from './sectionClass';

/**
 * 07 요약 줄이에요. 왼쪽은 불러온 사진 · 위치 있음 · 위치 없음 · 자동 정리,
 * 오른쪽은 [사진 모두 삭제] · [사진 더 추가 →] · [완료]예요.
 *
 * 호출: PhotoSortPage가 사진 수와 여행·도시 수를 넘겨요.
 * <SortSummary photos={{ total: 1284, located: 1261, unlocated: 23 }} tripCount={7} cityCount={13}
 *   canDeleteAll deleteStatus="idle" onDeleteAll={handleDeleteAll} />
 *
 * 의도:
 *  - [사진 더 추가]는 13 올리기, [완료]는 03 전체 기록으로 가요. Journey를 아직 계산하는 중이면 03은 앞 Journey를
 *    보여 주다가 저장되면 새로고침 없이 바뀌어요(#151).
 *  - 여행·도시 수는 Journey 기준이라, 보정을 저장한 뒤 계산이 끝날 때까지는 앞 값이에요.
 *  - [사진 모두 삭제](#284)는 되돌릴 수 없어서 확인 창(ConfirmDialog)으로 한 번 묻고, 확인했을 때만 onDeleteAll을 불러요.
 *    묻는 중인지는 이 버튼만 써서 여기 두고, 지우는 중 · 실패는 07의 다른 편집도 막아야 해서 PhotoSortPage가 들고 있어요.
 *    지우는 동안 버튼 글자를 바꾸고 막아요. 실패하면 버튼 아래에 안내를 남기고, 다시 누르면 남은 것만 지워요.
 *    사진이 없으면 지울 게 없어서 버튼을 그리지 않아요.
 *
 * @param {object} props
 * @param {{ total: number, located: number, unlocated: number }} props.photos
 * @param {number} props.tripCount
 * @param {number} props.cityCount
 * @param {boolean} props.canDeleteAll 보정을 저장하거나 Journey를 계산하는 중이면 false
 * @param {'idle' | 'deleting' | 'failed'} props.deleteStatus 모두 지우기 상태
 * @param {() => void} props.onDeleteAll 확인 창에서 [모두 삭제]를 누르면 불러요
 */
export default function SortSummary({
  photos,
  tripCount,
  cityCount,
  canDeleteAll,
  deleteStatus,
  onDeleteAll,
}) {
  const [isAsking, setIsAsking] = useState(false);
  const isDeleting = deleteStatus === 'deleting';

  const handleConfirm = () => {
    setIsAsking(false);
    onDeleteAll();
  };

  const counts = [
    { label: '불러온 사진', value: photos.total },
    { label: '위치 있음', value: photos.located },
    { label: '위치 없음', value: photos.unlocated },
  ];

  return (
    <section
      aria-label="사진 요약"
      className={`${SECTION_CLASS} flex items-center justify-between pt-8`}
    >
      <dl className="flex gap-8 whitespace-nowrap">
        {counts.map((count) => (
          <div key={count.label} className="flex items-baseline gap-2">
            <dt className="text-sm text-muted">{count.label}</dt>
            <dd className="font-serif text-lg font-bold text-ink">
              {count.value.toLocaleString('en-US')}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline gap-2">
          <dt className="text-sm text-muted">자동 정리</dt>
          <dd className="text-lg font-bold text-ink">
            <span className="font-serif">{tripCount.toLocaleString('en-US')}</span>개 여행 ·{' '}
            <span className="font-serif">{cityCount.toLocaleString('en-US')}</span>개 도시
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-6">
        {photos.total > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAsking(true)}
              disabled={!canDeleteAll || isDeleting}
              className="border-b border-current pb-1 text-md font-bold whitespace-nowrap text-accent disabled:text-dim"
            >
              {isDeleting ? '삭제하는 중…' : '사진 모두 삭제'}
            </button>
            {deleteStatus === 'failed' && (
              <p
                role="alert"
                className="absolute top-full right-0 pt-2 text-xs whitespace-nowrap text-accent"
              >
                사진을 모두 지우지 못했어요. 다시 눌러 주세요
              </p>
            )}
          </div>
        )}
        <Link
          to="/upload"
          className="flex gap-1 border-b border-ink pb-1 text-md font-bold whitespace-nowrap text-ink"
        >
          사진 더 추가
          <span aria-hidden="true" className="font-serif">
            →
          </span>
        </Link>
        <Link to="/places" className="bg-ink px-6 py-3 text-md font-bold text-white">
          완료
        </Link>
      </div>
      <ConfirmDialog
        isOpen={isAsking}
        title={`올린 사진 ${photos.total.toLocaleString('en-US')}장을 모두 삭제할까요?`}
        description="고친 기록과 쓴 글도 함께 지워지고, 복구할 수 없어요."
        confirmLabel="모두 삭제"
        isDanger
        onConfirm={handleConfirm}
        onCancel={() => setIsAsking(false)}
      />
    </section>
  );
}
