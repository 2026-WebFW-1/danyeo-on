import { cn } from '@/utils/cn';

import { CARD_CLASS } from './cardClass';
import CollagePhoto from './CollagePhoto';

/**
 * 콜라주의 글 카드예요. 날짜 · 제목 · 본문 앞부분이 들어가요.
 * hero는 챕터 첫날 글 하나만 쓰는 큰 카드로, 위에 사진이 붙고 크기가 정해져 있어요(402×412).
 *
 * 호출: Collage가 hero 칸과 글 카드 칸에 그려요.
 * <PostCard post={post} />
 * <PostCard post={post} photo={photo} isHero onOpenPhoto={handleOpen} />
 *
 * 의도:
 *  - 글이 길어도 카드가 다른 카드를 덮지 않게 줄 수를 막아요. 글 카드는 제목 2줄 · 본문 3줄까지(가장 큰 카드 242px),
 *    hero는 제목 1줄 · 본문 2줄까지예요. 칸 사이 간격이 이 크기에 맞춰져 있어요(constants/collage.js).
 *  - 본문의 줄바꿈은 공백처럼 이어서 보여요(앞부분만 보여 주는 자리예요). 문단 사이 빈 줄을 살리면 그 빈 줄이 줄 수를 쓰고
 *    "…"만 홀로 남은 줄이 생겨요.
 *
 * @param {object} props
 * @param {import('@/types').Post} props.post
 * @param {import('@/types').PhotoRef | null} [props.photo] hero 위에 붙일 사진
 * @param {boolean} [props.isHero]
 * @param {() => void} [props.onOpenPhoto] hero 사진을 눌렀을 때
 */
export default function PostCard({ post, photo = null, isHero = false, onOpenPhoto }) {
  return (
    <article className={cn(CARD_CLASS, 'flex flex-col overflow-clip', isHero && 'size-full')}>
      {isHero && (
        <CollagePhoto
          photo={photo}
          size="full"
          onOpen={onOpenPhoto}
          className="h-57.5 w-full shrink-0"
        />
      )}
      <div className="flex flex-col gap-2 p-7 break-words">
        <p className="font-serif text-sm font-bold text-muted">{post.date}</p>
        <h2 className={cn('text-3xl font-bold text-ink', isHero ? 'line-clamp-1' : 'line-clamp-2')}>
          {post.title}
        </h2>
        {post.body.trim() !== '' && (
          <p
            className={cn(
              'text-lg leading-body-lg text-body',
              isHero ? 'line-clamp-2' : 'line-clamp-3',
            )}
          >
            {post.body}
          </p>
        )}
      </div>
    </article>
  );
}
