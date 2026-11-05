import { formatDateRange } from '@/utils/formatDateRange';

/**
 * 한 지점의 글을 그 자리에서 펼쳐 보여 줘요. 04 글 상세 화면이 없어서 [글 보기 →]가 이걸 열어요.
 * 읽기만 해요. 고치는 건 02 챕터의 편집기(14a)에서 해요.
 *
 * @param {object} props
 * @param {string} props.id 펼침 버튼의 aria-controls와 맞추는 id예요
 * @param {import('@/types').Post[]} props.posts 날짜순
 */
export default function StopPosts({ id, posts }) {
  return (
    <ul id={id} className="mt-2 flex flex-col gap-6 border-t border-line pt-6">
      {posts.map((post) => (
        <li key={post.id} className="flex flex-col gap-2">
          <p className="font-serif text-sm font-bold text-muted">
            {formatDateRange(post.date, post.date)}
          </p>
          {post.title && <h4 className="text-lg font-bold text-ink">{post.title}</h4>}
          <p className="text-lg leading-body-lg whitespace-pre-line text-body">{post.body}</p>
          {post.tags.length > 0 && (
            <p className="text-xs text-muted">{post.tags.map((tag) => `#${tag}`).join(' ')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
