import { cn } from '@/utils/cn';

import { CARD_CLASS } from './cardClass';
import CollagePhoto from './CollagePhoto';
import EditCardButton from './EditCardButton';

/**
 * 콜라주의 글 카드예요. 날짜 · 제목 · 본문 앞부분이 들어가요.
 * hero는 제목이 있는 글 중 하나(무작위)만 쓰는 큰 카드로, 위에 사진이 붙고 크기가 정해져 있어요(402×412).
 *
 * 호출: Collage가 hero 칸과 글 카드 칸에 그려요.
 * <PostCard post={post} onEdit={handleEdit} />
 * <PostCard post={post} photo={photo} isHero onOpenPhoto={handleOpen} onEdit={handleEdit} />
 *
 * 의도:
 *  - 글이 길어도 카드가 다른 카드를 덮지 않게 줄 수를 막아요. 글 카드는 제목 2줄 · 본문 3줄까지(가장 큰 카드 242px),
 *    hero는 제목 1줄 · 본문 2줄까지예요. 칸 사이 간격이 이 크기에 맞춰져 있어요(constants/collage.js).
 *  - 본문의 줄바꿈은 공백처럼 이어서 보여요(앞부분만 보여 주는 자리예요). 문단 사이 빈 줄을 살리면 그 빈 줄이 줄 수를 쓰고
 *    "…"만 홀로 남은 줄이 생겨요.
 *  - 피그마의 글 상자는 카드보다 52px 좁아요(hero는 본문 폭 400에서 52px). 왼쪽 여백 28px보다 오른쪽 여백이 6px(hero는 4px)
 *    좁은 셈이라서, 줄이 바뀌는 자리가 피그마와 같도록 오른쪽 여백만 줄였어요(글 카드 22px, hero 24px).
 *  - onEdit이 있으면 글 부분 위에 보이지 않는 [고치기] 버튼을 덮어요(EditCardButton). hero의 사진은 그 아래가 아니라
 *    따로 있는 크게 보기 버튼이라 서로 겹치지 않아요. onEdit이 없으면 눌리지 않는 카드예요.
 *
 * @param {object} props
 * @param {import('@/types').Post} props.post
 * @param {import('@/types').PhotoRef | null} [props.photo] hero 위에 붙일 사진
 * @param {boolean} [props.isHero]
 * @param {() => void} [props.onOpenPhoto] hero 사진을 눌렀을 때
 * @param {(date: string) => void} [props.onEdit] 글 부분을 눌렀을 때. 이 글의 날짜를 넘겨요
 */
export default function PostCard({ post, photo = null, isHero = false, onOpenPhoto, onEdit }) {
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
      <div
        className={cn('relative flex flex-col gap-2 p-7 break-words', isHero ? 'pr-6' : 'pr-5.5')}
      >
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
        {onEdit && <EditCardButton date={post.date} onEdit={onEdit} />}
      </div>
    </article>
  );
}
