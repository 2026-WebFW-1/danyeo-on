import { useEffect, useRef, useState } from 'react';

import { MAX_POST_BODY_LENGTH, MAX_POST_TITLE_LENGTH } from '@/constants/post';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';
import { cn } from '@/utils/cn';
import { clearDraft, isDraftNewer, readDraft, writeDraft } from '@/utils/postDraft';
import { formatPostDate, isPostDirty, normalizeTags } from '@/utils/postForm';
import { initialSelection } from '@/utils/postPhotos';

import PostPhotoPicker from './PostPhotoPicker';
import PostTagField from './PostTagField';

const SAVED_NOTICE_MS = 1000;
const DRAFT_DELAY_MS = 500;
const EMPTY_POST = { title: '', body: '', tags: [], photoIds: [] };
const NO_PHOTOS = [];
const FIELD_CLASS =
  'w-full border border-line bg-white px-4 py-3 text-lg leading-body-lg font-normal text-ink disabled:opacity-60';
const LABEL_CLASS = 'flex flex-col gap-1 text-xs font-medium text-dim';

/**
 * 그날의 글을 쓰고 고치는 편집기
 *
 * 책임: 그날 글을 보여 주고, 제목·본문·태그와 붙일 그날 사진(#194)을 고쳐 저장합니다. 저장 중·저장됨은 오른쪽 위에,
 * 저장 실패는 편집기 안에 [다시 시도]와 함께 보여 줍니다(14b).
 * 쓴 글을 잃지 않게 임시 보관, 다시 열 때 불러오기, 탭 닫기·[취소] 경고도 맡습니다(14b).
 * 저장된 글을 지우는 것도 맡습니다(#207).
 * 왼쪽의 큰 사진과 챕터 머리는 02의 배치라 여기에 없습니다. 너비는 부르는 쪽(02 · 03)이 정합니다.
 *
 * 호출: 02 챕터의 글 고치는 화면(PostEditView, C). 글 카드를 누르거나 [+ 글 쓰기]로 날짜를 고르면 열립니다(#203).
 *   03 도시 블록(CityBlock, C)에서도 [+ 글 쓰기]로 날짜를 고르면 그 글 칸 안에 열립니다(#216).
 *   편집기 하나에 날짜 하나로 씁니다.
 * <PostEditor date="2025-07-12" dayNumber={15} dayPhotos={dayPhotos} onClose={() => setIsEditing(false)} />
 *
 * 의도: 입력은 고치기 시작할 때만 draft로 들고, 그 전에는 스토어의 글을 그대로 보여 줍니다.
 * 그래서 글을 다 불러온 뒤 입력 칸으로 옮겨 담는 useEffect가 필요 없고, 취소는 draft를 비우면 끝납니다.
 *
 * 주의할 것들:
 *  - 한 편집기로 다른 날짜를 이어서 열려면 key={date}를 주세요. 쓰던 내용이 다음 날짜로 넘어가지 않게요.
 *  - 다 불러오기 전에는 입력을 끕니다. 그때 쓴 내용이 불러온 글을 덮거나, 그날 글을 못 찾아 글이 늘 수 있어요(#110).
 *  - 태그 칸에 쓰고 Enter를 안 눌렀어도 저장 대상에 넣습니다. 쓴 태그가 말없이 사라지지 않게요.
 *  - 저장 중 [취소]는 끕니다. 이미 보낸 저장은 되돌릴 수 없어요.
 *  - [글 지우기]는 저장된 글에만 둡니다(#207). 되돌릴 수 없어서 window.confirm으로 한 번 묻고, 지우면 임시본도 지우고 닫습니다.
 *    피그마 14a에 자리가 없어서, 저장·취소보다 덜 눈에 띄게 버튼 줄 오른쪽 끝의 밑줄 글자로 둡니다.
 *    저장 중에는 지울 수 없고, 지우는 중에는 입력과 버튼을 모두 막습니다. 실패하면 글을 그대로 두고 [다시 시도]를 띄웁니다.
 *    "저장됨 · 방금"을 보여 주는 1초 동안도 끕니다. 그 사이 편집기가 닫혀 지우기 결과를 못 보게 돼요.
 *    지우는 중에는 [불러오기]·[버리기]도 끄고, 계정이 바뀌면 지우기 실패 안내를 비우고 이전 계정의 결과는 버립니다.
 *    실패 안내의 [다시 시도]는 저장·지우기가 끝난 뒤에만 보입니다. 같은 글에 저장과 지우기가 겹쳐 가지 않게요.
 *  - 저장에 성공하면 "저장됨 · 방금"을 1초 보여 준 뒤 onClose를 부릅니다. 바로 닫으면 카드가 사라져 안내를 볼 수 없어요.
 *    그 사이에 다시 고치면 닫지 않습니다. 쓴 내용이 사라지지 않게요.
 *  - "저장 실패"는 스토어의 saveError로 보지 않습니다. saveError는 다음 저장까지 남아서, 취소하고 다시 열어도 보이게 돼요.
 *  - 고친 게 있는 동안 0.5초마다 localStorage['post-draft:<userId>:<date>']에 임시본을 둡니다(utils/postDraft).
 *    키에 계정 id가 있어서 다른 계정에는 안 보이고, 저장에 성공하거나 [취소]·[버리기]로 버리면 지웁니다.
 *    0.5초가 지나기 전에 편집기가 사라지면 그때 바로 씁니다. 계정이 바뀌면 입력을 비우고 새 계정의 임시본을 읽습니다.
 *  - 저장 중에는 입력을 막습니다. 저장이 끝나면 입력을 비우니, 그 사이에 고친 내용이 사라지지 않게요.
 *  - "저장 안 한 글이 있어요"가 떠 있는 동안에는 임시본을 쓰지 않습니다. 고르기 전에 맡겨 둔 글을 덮지 않게요.
 *  - 사진은 dayPhotos(그날 사진)에서만 고릅니다. 처음에는 글의 photoIds 중 그날 사진인 것을, 없으면 그날 사진 전부를
 *    골라 두고(utils/postPhotos), 그 상태를 저장된 값으로 칩니다. 그날 사진이 아닌 ID는 저장할 때 빠져요.
 *    dayPhotos가 비면 사진 칸을 숨기고 photoIds를 글 그대로 둡니다. 사진 목록이 없다고 붙은 사진을 지우지 않게요.
 *    고르는 중인 사진은 onPhotoIdsChange로 알려요. 02가 왼쪽 큰 사진을 저장 전에도 바꿔 보여 줘요.
 *  - 앱 안 이동은 막지 않습니다. useBlocker는 createBrowserRouter에서만 동작해서, 대신 임시본으로 글을 지킵니다.
 *    탭 닫기·새로고침은 고친 게 있을 때만 beforeunload로, [취소]는 window.confirm으로 묻습니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-158
 */
export default function PostEditor({
  date,
  dayNumber,
  dayPhotos = NO_PHOTOS,
  onPhotoIdsChange,
  onClose,
}) {
  const post = usePostStore((state) => state.byDate[date]);
  const status = usePostStore((state) => state.status);
  const isSaving = usePostStore((state) => Boolean(state.saving[date]));
  const fetchPosts = usePostStore((state) => state.fetch);
  const savePost = usePostStore((state) => state.save);
  const isDeleting = usePostStore((state) => Boolean(state.deleting[date]));
  const removePost = usePostStore((state) => state.remove);
  const userId = useAuthStore((state) => state.user?.id);

  const [draft, setDraft] = useState(null);
  const [storedDraft, setStoredDraft] = useState(() => (userId ? readDraft(userId, date) : null));
  const [tagText, setTagText] = useState('');
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [hasSaveFailed, setHasSaveFailed] = useState(false);
  const [hasDeleteFailed, setHasDeleteFailed] = useState(false);
  const [draftUserId, setDraftUserId] = useState(userId);
  const pendingDraftRef = useRef(null);

  // 다른 탭에서 계정이 바뀌어도 편집기는 그대로 남아요. 이전 계정의 입력·임시본을 버리고 새 계정 것을 읽어요.
  if (draftUserId !== userId) {
    setDraftUserId(userId);
    setStoredDraft(userId ? readDraft(userId, date) : null);
    setDraft(null);
    setTagText('');
    // 이전 계정에서 받은 지우기 확인으로 새 계정의 글을 지우지 않게, 지우기 실패 안내도 비워요.
    setHasDeleteFailed(false);
  }

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

  const dayPhotoIds = dayPhotos.map((photo) => photo.id);
  const hasDayPhotos = dayPhotoIds.length > 0;
  // 그날 사진이 있으면 처음 골라 둔 사진을 저장된 값으로 쳐요. 열자마자 저장이 켜지지 않게요.
  const saved = hasDayPhotos
    ? { ...(post ?? EMPTY_POST), photoIds: initialSelection(post, dayPhotoIds) }
    : (post ?? EMPTY_POST);
  const form = draft ?? saved;
  const current = { ...form, tags: normalizeTags([...form.tags, tagText]) };
  const isReady = status === 'ready';
  const isBusy = isSaving || isDeleting;
  const isDirty = isPostDirty(saved, current);
  if (isJustSaved && isDirty) setIsJustSaved(false);
  const isOfferingDraft = isReady && storedDraft !== null && isDraftNewer(storedDraft, post);

  // 렌더마다 current가 새 객체라서, 내용이 바뀔 때만 타이머를 다시 걸도록 문자열로 견줘요.
  const currentJson = JSON.stringify(current);
  useEffect(() => {
    if (!userId || !isDirty || isOfferingDraft) {
      pendingDraftRef.current = null;
      return undefined;
    }
    const write = () => {
      pendingDraftRef.current = null;
      writeDraft(userId, date, JSON.parse(currentJson));
    };
    pendingDraftRef.current = write;
    const timer = setTimeout(write, DRAFT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [userId, date, isDirty, isOfferingDraft, currentJson]);

  // 0.5초가 지나기 전에 앱 안 링크로 떠나도 마지막 입력이 남게, 사라질 때 못 쓴 임시본을 바로 써요.
  useEffect(() => () => pendingDraftRef.current?.(), []);

  // 고르는 중인 사진을 부모에게 알려요. 02가 저장 전에도 왼쪽 큰 사진을 고른 첫 장으로 보여 줘요.
  const photoIdsJson = JSON.stringify(form.photoIds);
  useEffect(() => {
    onPhotoIdsChange?.(JSON.parse(photoIdsJson));
  }, [photoIdsJson, onPhotoIdsChange]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeLeave = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [isDirty]);

  const clearInput = () => {
    setDraft(null);
    setTagText('');
  };

  // 곧 사라질 때 못 쓴 임시본이 다시 써지지 않게 같이 버려요.
  const removeStoredDraft = () => {
    pendingDraftRef.current = null;
    if (userId) clearDraft(userId, date);
  };

  const handleSave = async () => {
    try {
      await savePost({ date, ...current });
    } catch {
      setHasSaveFailed(true); // 쓴 내용은 그대로 둬요.
      return;
    }
    removeStoredDraft();
    clearInput();
    setHasSaveFailed(false);
    // 저장이 끝난 글에 앞선 지우기 실패의 [다시 시도]가 남으면, 저장됨 1초 동안 눌려 결과를 못 보고 닫혀요.
    setHasDeleteFailed(false);
    setIsJustSaved(true);
  };

  const handleLoadDraft = () => {
    const { title, body, tags, photoIds } = storedDraft;
    setDraft({
      title,
      body,
      tags,
      photoIds: hasDayPhotos ? initialSelection(storedDraft, dayPhotoIds) : photoIds,
    });
    setStoredDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft(userId, date);
    setStoredDraft(null);
  };

  // [다시 시도]는 이미 한 번 확인을 받아서 다시 묻지 않아요.
  const deletePost = async () => {
    // 지우는 사이 다른 탭에서 계정이 바뀌면, 이전 계정의 결과로 새 계정의 편집기를 바꾸지 않아요.
    const isSameUser = () => useAuthStore.getState().user?.id === userId;
    try {
      await removePost(date);
    } catch {
      if (isSameUser()) setHasDeleteFailed(true); // 글은 그대로 둬요.
      return;
    }
    if (!isSameUser()) return;
    removeStoredDraft();
    clearInput();
    setHasDeleteFailed(false);
    onClose?.();
  };

  const handleDelete = () => {
    if (!window.confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return;
    deletePost();
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('저장하지 않은 내용이 있어요. 닫을까요?')) return;
    removeStoredDraft();
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
        <p role="status" className="shrink-0 text-dim">
          {isSaving && '저장 중…'}
          {isDeleting && '지우는 중…'}
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

      {isOfferingDraft && (
        <div className="flex items-center justify-between gap-2 text-sm text-ink">
          <span>저장 안 한 글이 있어요</span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleLoadDraft}
              className="border border-ink px-3 py-1 font-medium disabled:opacity-60"
            >
              불러오기
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDiscardDraft}
              className="border border-ink px-3 py-1 font-medium disabled:opacity-60"
            >
              버리기
            </button>
          </div>
        </div>
      )}

      {!isBusy && hasSaveFailed && (
        <div role="alert" className="flex items-center justify-between gap-2 text-sm text-accent">
          <span>저장하지 못했어요</span>
          <button
            type="button"
            onClick={handleSave}
            className="shrink-0 border border-ink px-3 py-1 font-medium text-ink"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isBusy && hasDeleteFailed && (
        <div role="alert" className="flex items-center justify-between gap-2 text-sm text-accent">
          <span>지우지 못했어요</span>
          <button
            type="button"
            onClick={deletePost}
            className="shrink-0 border border-ink px-3 py-1 font-medium text-ink"
          >
            다시 시도
          </button>
        </div>
      )}

      <label className={LABEL_CLASS}>
        제목
        <input
          type="text"
          name="title"
          maxLength={MAX_POST_TITLE_LENGTH}
          disabled={!isReady || isBusy}
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
          disabled={!isReady || isBusy}
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
          isDisabled={!isReady || isBusy}
          onTagsChange={(tags) => setDraft({ ...form, tags })}
          onTextChange={setTagText}
        />
      </div>

      {hasDayPhotos && (
        <div className={LABEL_CLASS}>
          사진
          <PostPhotoPicker
            photos={dayPhotos}
            selectedIds={form.photoIds}
            isDisabled={!isReady || isBusy}
            onChange={(photoIds) => setDraft({ ...form, photoIds })}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!isReady || !isDirty || isBusy}
          onClick={handleSave}
          className="bg-nav px-5 py-3 text-md font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={handleCancel}
          className="border border-ink px-5 py-3 text-md font-bold text-ink disabled:opacity-60"
        >
          취소
        </button>
        {post && (
          <button
            type="button"
            disabled={!isReady || isBusy || isJustSaved}
            onClick={handleDelete}
            className="ml-auto text-sm text-accent underline underline-offset-4 disabled:opacity-60"
          >
            글 지우기
          </button>
        )}
      </div>
    </div>
  );
}
