import { useState } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';

/**
 * 사진 한 장과 그 사진에 하는 동작 버튼 하나예요. ⋯로 펼친 여행 사진의 [빼기]와 제외한 사진의 [복구]가 같이 써요.
 *
 * 호출:
 * <SortPhotoCard fileKey={photo.fileKey} actionLabel="빼기" workingLabel="빼는 중…"
 *   failMessage="사진을 빼지 못했어요" canAct onAction={() => onExclude(photo.id)} />
 *
 * 의도:
 *  - 요청이 끝날 때까지 버튼을 막아 두 번 보내지 않게 해요. 성공하면 목록에서 빠져 이 칸이 사라져요.
 *  - 실패하면 칸에 안내를 남겨, 같은 버튼을 다시 누르면 돼요.
 *  - 요청 중 · 실패는 이 칸에서만 쓰는 값이라 여기 둬요.
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {string} [props.caption] 사진 아래 작은 글자. 예: 촬영 날짜
 * @param {string} props.actionLabel
 * @param {string} props.workingLabel
 * @param {string} props.failMessage
 * @param {boolean} props.canAct 보정을 다 불러왔을 때만 true
 * @param {() => Promise<unknown>} props.onAction 실패하면 던져요
 */
export default function SortPhotoCard({
  fileKey,
  caption,
  actionLabel,
  workingLabel,
  failMessage,
  canAct,
  onAction,
}) {
  const [isWorking, setIsWorking] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const handleClick = async () => {
    setIsWorking(true);
    setHasFailed(false);
    try {
      await onAction();
    } catch (error) {
      console.error(error);
      setHasFailed(true);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <li className="flex flex-col gap-1.5">
      <PhotoGridCell fileKey={fileKey} index={0} />
      {caption && <p className="font-serif text-2xs font-bold text-muted">{caption}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={!canAct || isWorking}
        className="self-start border-b border-ink text-sm font-bold text-ink disabled:border-dim disabled:text-dim"
      >
        {isWorking ? workingLabel : actionLabel}
      </button>
      {hasFailed && (
        <p role="alert" className="text-2xs text-accent">
          {failMessage}
        </p>
      )}
    </li>
  );
}
