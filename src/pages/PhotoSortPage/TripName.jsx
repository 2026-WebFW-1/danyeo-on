import { useState } from 'react';

import { SORT_NAME_MAX_LENGTH } from '@/constants/photoSort';

/**
 * 07a 여행 줄의 번호 · 이름 · ✎예요. ✎를 누르면 그 자리에서 이름을 고쳐요.
 *
 * 호출: TripRow가 여행 번호와 이름, 이름을 저장하는 함수를 넘겨요.
 * <TripName no="02" name="방콕 · 다낭" canRename onRename={(name) => add({ type: 'rename', ... })} />
 *
 * 의도:
 *  - Enter나 [저장]으로 저장하고, Esc나 [취소]로 그만둬요. 바꾼 게 없거나 비워 두면 저장하지 않고 닫아요.
 *  - 저장이 끝나야 닫아요. 실패하면 입력한 이름을 그대로 두고 안내를 띄워, 다시 누르기만 하면 돼요.
 *  - 고치는 중인지 · 입력한 글자는 이 줄에서만 쓰는 값이라 여기 둬요.
 *
 * @param {object} props
 * @param {string} props.no 예: '02'
 * @param {string} props.name
 * @param {boolean} props.canRename 보정을 다 불러왔고 이 여행에 보내는 중인 요청이 없을 때만 true
 * @param {(name: string) => Promise<unknown>} props.onRename 실패하면 던져요
 */
export default function TripName({ no, name, canRename, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const handleStart = () => {
    setDraft(name);
    setHasFailed(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasFailed(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canRename) return;
    const nextName = draft.trim();
    if (nextName === '' || nextName === name) {
      handleCancel();
      return;
    }

    setIsSaving(true);
    setHasFailed(false);
    try {
      await onRename(nextName);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setHasFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !isSaving) handleCancel();
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-md font-bold text-muted">{no}</span>
          <input
            // ✎를 눌러 연 칸이라 바로 입력할 수 있게 해요.
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            maxLength={SORT_NAME_MAX_LENGTH}
            aria-label={`${no}번 여행 이름`}
            className="w-64 border-b border-ink bg-transparent text-3xl font-bold text-ink outline-none disabled:text-dim"
          />
        </div>
        <div className="flex items-center gap-3 pl-6 text-sm">
          <button
            type="submit"
            disabled={isSaving || !canRename}
            className="font-bold text-ink disabled:text-dim"
          >
            {isSaving ? '저장하는 중…' : '저장'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-muted disabled:text-dim"
          >
            취소
          </button>
        </div>
        {hasFailed && (
          <p role="alert" className="pl-6 text-sm text-accent">
            이름을 저장하지 못했어요. 다시 저장해 주세요.
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-serif text-md font-bold text-muted">{no}</span>
      <h3 className="text-3xl font-bold text-ink">{name}</h3>
      <button
        type="button"
        onClick={handleStart}
        disabled={!canRename}
        aria-label={`${name} 이름 바꾸기`}
        className="text-md leading-body-md text-dim hover:text-ink disabled:hover:text-dim"
      >
        ✎
      </button>
    </div>
  );
}
