import { formatPostDate } from '@/utils/postForm';

/**
 * 카드 글 부분 위에 덮는 보이지 않는 [고치기] 버튼이에요. 누르면 그 날짜의 글 편집(14a)을 열어요.
 *
 * 호출: PostCard와 NoteCard가 글 부분(position: relative인 상자) 안에 놓아요.
 * <EditCardButton date={post.date} onEdit={onEdit} />
 *
 * 의도:
 *  - 카드를 통째로 <button>으로 감싸면 제목·문단이 버튼 안에 들어가고, hero는 사진 버튼까지 겹쳐서 버튼 안에 버튼이 생겨요.
 *    그래서 글은 그대로 두고 버튼만 위에 덮어요. Tab·Enter와 스크린 리더로도 열려요.
 *  - hero는 사진 부분이 아니라 글 부분 상자 안에 놓아서, 사진을 누르면 그대로 크게 보기가 열려요.
 *
 * @param {object} props
 * @param {string} props.date 고칠 글의 현지 날짜 YYYY-MM-DD
 * @param {(date: string) => void} props.onEdit
 */
export default function EditCardButton({ date, onEdit }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(date)}
      aria-label={`${formatPostDate(date)} 글 고치기`}
      className="absolute inset-0 cursor-pointer bg-ink/0 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    />
  );
}
