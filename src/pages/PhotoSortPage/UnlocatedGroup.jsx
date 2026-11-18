import { useState } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';
import { SORT_GROUP_PREVIEW_COUNT } from '@/constants/photoSort';
import { useInView } from '@/hooks/useInView';

/**
 * 07b 위치 확인 필요의 날짜 묶음 하나예요. 날짜 · 장수 | 안내 | [타임라인에서 제외], 아래로 사진 미리보기.
 *
 * 호출: UnlocatedTab이 묶음마다 그려요.
 * <UnlocatedGroup group={group} canExclude onExclude={(photoIds) => ...} />
 *
 * 의도:
 *  - [타임라인에서 제외]는 묶음의 사진을 모두 빼요. 뺀 사진은 바로 이 묶음에서 빠지고 제외한 사진 탭에 들어가요.
 *    일부만 실패하면 실패한 사진만 남아서, 다시 누르면 남은 사진만 빼요.
 *  - 피그마 07b의 추정 위치 · 확신 · [모두 ○○로] · [직접 지정](C109)은 이 이슈에서 다루지 않아서 그 자리에 안내만 둬요.
 *  - 사진은 앞에서부터 SORT_GROUP_PREVIEW_COUNT장만 보여 주고 나머지는 +N으로 적어요. 묶음이 화면 가까이 왔을 때 그려요.
 *  - 요청 중 · 실패는 이 묶음에서만 쓰는 값이라 여기 둬요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').UnlocatedGroup} props.group
 * @param {boolean} props.canExclude 보정을 다 불러왔을 때만 true
 * @param {(photoIds: string[]) => Promise<unknown>} props.onExclude 하나라도 실패하면 던져요
 */
export default function UnlocatedGroup({ group, canExclude, onExclude }) {
  const { ref, isInView } = useInView();
  const [isWorking, setIsWorking] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const preview = group.photos.slice(0, SORT_GROUP_PREVIEW_COUNT);
  const restCount = group.photos.length - preview.length;
  const title = group.date ?? '날짜 없음';

  const handleExclude = async () => {
    setIsWorking(true);
    setHasFailed(false);
    try {
      await onExclude(group.photos.map((photo) => photo.id));
    } catch (error) {
      console.error(error);
      setHasFailed(true);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <li ref={ref} className="flex flex-col gap-5 border-t border-line pt-5">
      <div className="flex items-start">
        <div className="flex w-65 shrink-0 flex-col gap-1">
          <h3 className="text-3xl font-bold text-ink">{title}</h3>
          <p className="text-md leading-body-md text-muted">사진 {group.photos.length}장</p>
        </div>
        <p className="flex-1 pt-1.5 text-md leading-body-md text-muted">
          {group.date
            ? '사진에 위치가 없어 지도와 여행에 넣지 못했어요.'
            : '사진에 찍은 날짜가 없어 타임라인에 놓지 못했어요. 스크린샷이나 저장한 이미지일 수 있어요.'}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleExclude}
            disabled={!canExclude || isWorking}
            aria-label={`${title} 사진 ${group.photos.length}장 타임라인에서 제외`}
            className="bg-ink px-5 py-3 text-md font-bold text-white disabled:bg-dim"
          >
            {isWorking ? '제외하는 중…' : '타임라인에서 제외'}
          </button>
          {hasFailed && (
            <p role="alert" className="text-sm text-accent">
              일부 사진을 빼지 못했어요. 다시 눌러 주세요.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-65">
        {preview.map((photo) => (
          <div key={photo.id} className="w-32">
            {isInView ? (
              <PhotoGridCell fileKey={photo.fileKey} index={0} />
            ) : (
              <div className="aspect-square bg-line" />
            )}
          </div>
        ))}
        {restCount > 0 && (
          <p className="pl-2 font-serif text-lg font-bold text-muted">+{restCount}</p>
        )}
      </div>
    </li>
  );
}
