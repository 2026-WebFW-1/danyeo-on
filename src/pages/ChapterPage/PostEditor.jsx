import { useEffect, useState } from 'react';

import { MAX_POST_BODY_LENGTH, MAX_POST_TITLE_LENGTH } from '@/constants/post';
import { usePostStore } from '@/stores/postStore';
import { cn } from '@/utils/cn';
import { formatPostDate, isPostDirty, normalizeTags } from '@/utils/postForm';

import PostTagField from './PostTagField';

const SAVED_NOTICE_MS = 1000;
const EMPTY_POST = { title: '', body: '', tags: [], photoIds: [] };
const FIELD_CLASS =
  'w-full border border-line bg-white px-4 py-3 text-lg leading-body-lg font-normal text-ink disabled:opacity-60';
const LABEL_CLASS = 'flex flex-col gap-1 text-xs font-medium text-dim';

/**
 * 그날의 글을 쓰고 고치는 편집기
 *
 * 책임: 그날 글을 보여 주고, 제목·본문·태그를 고쳐 저장합니다. 저장 중·저장됨·실패를 오른쪽 위에 보여 줍니다.
 * 왼쪽의 큰 사진과 챕터 머리는 02의 배치라 여기에 없습니다. 너비도 02가 정합니다.
 *
 * 호출: 02 챕터의 글 카드 자리(C). 카드 하나에 날짜 하나로 씁니다.
 * <PostEditor date="2025-07-12" dayNumber={15} onClose={() => setIsEditing(false)} />
 *
 * 의도: 입력은 고치기 시작할 때만 draft로 들고, 그 전에는 스토어의 글을 그대로 보여 줍니다.
 * 그래서 글을 다 불러온 뒤 입력 칸으로 옮겨 담는 useEffect가 필요 없고, 취소는 draft를 비우면 끝납니다.
 *
 * 주의할 것들:
 *  - 한 편집기로 다른 날짜를 이어서 열려면 key={date}를 주세요. 쓰던 내용이 다음 날짜로 넘어가지 않게요.
 *  - 다 불러오기 전에는 입력을 끕니다. 그때 쓴 내용이 불러온 글을 덮거나, 그날 글을 못 찾아 글이 늘 수 있어요(#110).
 *  - 태그 칸에 쓰고 Enter를 안 눌렀어도 저장 대상에 넣습니다. 쓴 태그가 말없이 사라지지 않게요.
 *  - 저장 중 [취소]는 끕니다. 이미 보낸 저장은 되돌릴 수 없어요.
 *  - 저장에 성공하면 "저장됨 · 방금"을 1초 보여 준 뒤 onClose를 부릅니다. 바로 닫으면 카드가 사라져 안내를 볼 수 없어요.
 *    그 사이에 다시 고치면 닫지 않습니다. 쓴 내용이 사라지지 않게요.
 *  - "저장 실패"는 스토어의 saveError로 보지 않습니다. saveError는 다음 저장까지 남아서, 취소하고 다시 열어도 보이게 돼요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-158
 */
export default function PostEditor({ date, dayNumber, onClose }) {
  const post = usePostStore((state) => state.byDate[date]);
  const status = usePostStore((state) => state.status);
  const isSaving = usePostStore((state) => Boolean(state.saving[date]));
  const fetchPosts = usePostStore((state) => state.fetch);
  const savePost = usePostStore((state) => state.save);

  const [draft, setDraft] = useState(null);
  const [tagText, setTagText] = useState('');
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [hasSaveFailed, setHasSaveFailed] = useState(false);

  useEffect(() => {
    if (status === 'idle') fetchPosts();
  }, [status, fetchPosts]);

  useEffect(() => {
    if (!isJustSaved) return undefined;
    const timer = setTimeout(() => {
      setIsJustSaved(false);
      onClose?.();
    }, SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [isJustSaved, onClose]);

  const saved = post ?? EMPTY_POST;
  const form = draft ?? saved;
  const current = { ...form, tags: normalizeTags([...form.tags, tagText]) };
  const isReady = status === 'ready';
  const isDirty = isPostDirty(saved, current);
  if (isJustSaved && isDirty) setIsJustSaved(false);

  const clearInput = () => {
    setDraft(null);
    setTagText('');
  };

  const handleSave = async () => {
    try {
      await savePost({ date, ...current });
    } catch {
      setHasSaveFailed(true); // 쓴 내용은 그대로 둬요.
      return;
    }
    clearInput();
    setHasSaveFailed(false);
    setIsJustSaved(true);
  };

  const handleCancel = () => {
    clearInput();
    setHasSaveFailed(false);
    setIsJustSaved(false);
    onClose?.();
  };

  return (
    <div className="flex flex-col gap-5 border border-ink bg-white px-8 py-7">
      <div className="flex items-center gap-2 text-sm font-medium">
        <p className="min-w-0 flex-1 font-mono text-muted">
          {formatPostDate(date)}
          {dayNumber !== undefined && ` · Day ${dayNumber}`}
        </p>
        <p
          role="status"
          className={cn('shrink-0 text-dim', !isSaving && hasSaveFailed && 'text-accent')}
        >
          {isSaving && '저장 중…'}
          {!isSaving && hasSaveFailed && '저장 실패'}
          {isJustSaved && '저장됨 · 방금'}
        </p>
      </div>

      {status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-2 text-sm text-accent">
          <span>글을 불러오지 못했어요</span>
          <button
            type="button"
            onClick={fetchPosts}
            className="shrink-0 border border-ink px-3 py-1 font-medium text-ink"
          >
            다시 불러오기
          </button>
        </div>
      )}

      <label className={LABEL_CLASS}>
        제목
        <input
          type="text"
          name="title"
          maxLength={MAX_POST_TITLE_LENGTH}
          disabled={!isReady}
          value={form.title}
          onChange={(event) => setDraft({ ...form, title: event.target.value })}
          className={FIELD_CLASS}
        />
      </label>

      <label className={LABEL_CLASS}>
        본문
        <textarea
          name="body"
          maxLength={MAX_POST_BODY_LENGTH}
          disabled={!isReady}
          value={form.body}
          onChange={(event) => setDraft({ ...form, body: event.target.value })}
          className={cn(FIELD_CLASS, 'h-40 resize-none')}
        />
      </label>

      <div className={LABEL_CLASS}>
        태그
        <PostTagField
          tags={form.tags}
          text={tagText}
          isDisabled={!isReady}
          onTagsChange={(tags) => setDraft({ ...form, tags })}
          onTextChange={setTagText}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!isReady || !isDirty || isSaving}
          onClick={handleSave}
          className="bg-nav px-5 py-3 text-md font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleCancel}
          className="border border-ink px-5 py-3 text-md font-bold text-ink disabled:opacity-60"
        >
          취소
        </button>
      </div>
    </div>
  );
}
