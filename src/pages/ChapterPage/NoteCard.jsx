import { cn } from '@/utils/cn';

import { CARD_CLASS } from './cardClass';

/**
 * 콜라주의 메모 카드예요. 제목 없이 본문만 있는 짧은 글이에요. 사진별 글이나 제목 없는 짧은 글의 본문을 담아요.
 *
 * 호출: Collage가 메모 칸에 그려요. 폭은 칸이 정해요.
 * <NoteCard text="비 오는 날이 이렇게 많을 줄은 몰랐는데…" />
 *
 * 의도:
 *  - 4줄까지만 보여 줘서(173px) 칸 사이 간격 안에 들어와요. line-clamp는 안쪽 글에 걸어요.
 *    안쪽 여백(padding)이 있는 요소에 걸면 잘려야 할 다음 줄이 여백에 비쳐요.
 *  - 글의 줄바꿈은 공백처럼 이어서 보여요. 빈 줄을 살리면 그 줄이 4줄 안을 쓰고 "…"만 홀로 남아요(PostCard와 같아요).
 *  - 피그마의 글 상자는 카드보다 52px 좁아서(300px 카드에 248px), 오른쪽 여백만 22px로 줄여요(PostCard와 같아요).
 *
 * @param {object} props
 * @param {string} props.text
 */
export default function NoteCard({ text }) {
  return (
    <div className={cn(CARD_CLASS, 'p-7 pr-5.5')}>
      <p className="line-clamp-4 text-lg leading-body-lg break-words text-body">{text}</p>
    </div>
  );
}
