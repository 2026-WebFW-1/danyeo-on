import { useState } from 'react';

/** 여행을 나누거나 합친 보정을 지워요. 실패하면 같은 자리에서 다시 시도할 수 있어요. */
export default function UndoGroupingButton({ action, canUndo, onUndo }) {
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
        {isWorking ? (action === '나누기' ? '합치는 중…' : '취소하는 중…') : `${action} 취소`}
      </button>
      {hasFailed && (
        <p role="alert" className="text-2xs text-accent">
          {action}를 취소하지 못했어요
        </p>
      )}
    </div>
  );
}
