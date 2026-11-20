import { useState } from 'react';

/**
 * 나눠서 생긴 여행 줄의 [나누기 취소]예요. 누르면 그 줄을 떼어 낸 split 보정을 지워 앞 여행과 다시 합쳐요.
 *
 * 호출: TripRow가 trip.splitIds가 있을 때 기간 아래에 그려요.
 * <UndoSplitButton canUndo onUndo={() => sendOne(onUndoSplit)} />
 *
 * 의도:
 *  - 지우면 보정 목록에서 split이 빠져 이 버튼이 바로 사라져요. 줄이 하나로 합쳐지는 건 Journey를 다시 계산한 뒤예요.
 *  - 실패하면 버튼 옆에 안내를 남겨, 다시 누르면 돼요. 요청 중 · 실패는 이 버튼에서만 쓰는 값이라 여기 둬요.
 *
 * @param {object} props
 * @param {boolean} props.canUndo
 * @param {() => Promise<unknown>} props.onUndo 실패하면 던져요
 */
export default function UndoSplitButton({ canUndo, onUndo }) {
  const [isWorking, setIsWorking] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const handleClick = async () => {
    setIsWorking(true);
    setHasFailed(false);
    try {
      await onUndo();
    } catch (error) {
      console.error(error);
      setHasFailed(true);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex items-baseline gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!canUndo || isWorking}
        className="self-start border-b border-muted text-2xs font-bold text-muted hover:text-ink disabled:border-dim disabled:text-dim"
      >
        {isWorking ? '합치는 중…' : '나누기 취소'}
      </button>
      {hasFailed && (
        <p role="alert" className="text-2xs text-accent">
          나누기를 취소하지 못했어요
        </p>
      )}
    </div>
  );
}
