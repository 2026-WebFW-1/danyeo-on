import { useEffect, useRef } from 'react';

import { cn } from '@/utils/cn';
import { formatPhotoCaption, getDayNumber, pickEditPhoto } from '@/utils/chapterEdit';

import CollagePhoto from './CollagePhoto';
import { FRAME_CLASS } from './frameClass';
import PostEditor from './PostEditor';

/**
 * 02 안에서 글 하나를 고치는 화면(14a)이에요. 왼쪽에 그날 사진과 설명, 오른쪽에 D의 PostEditor를 놓아요.
 *
 * 호출: ChapterView가 콜라주 대신 그려요. 글 카드를 눌렀을 때만 열려요(따로 가는 주소는 없어요).
 * <PostEditView stop={stop} date="2025-07-12" post={post} stopPhotos={stopPhotos} onOpenPhoto={handleOpenPhoto} onClose={handleClose} />
 *
 * 의도:
 *  - 자리는 피그마 14a의 값이에요. 사진 600×600, 편집기 560, 둘 사이 40, 양옆 120이에요(1440px 기준).
 *    화면이 좁아지면 사진 칸이 먼저 줄어요. 머리(ChapterHeader)는 02의 것을 그대로 두고 그 아래에 놓아요.
 *  - 왼쪽 사진은 글에 붙은 사진 중 이 지점의 첫 장이고, 없으면 그날 찍은 사진의 첫 장이에요. 없으면 회색 칸이에요.
 *    여러 장 중 고르는 일은 D의 "글에 사진 고르기"에서 해요.
 *  - Day N은 챕터 첫날이 Day 1이에요. 지점이 시작하기 전 날짜면 번호 없이 날짜만 보여요.
 *  - 편집기를 key={date}로 그려서 다른 날짜를 열면 쓰던 내용이 넘어가지 않아요.
 *  - 열리면 이 화면으로 포커스를 옮겨요. 콜라주의 카드 버튼이 사라지면서 포커스가 몸통으로 떨어져서, 키보드 사용자가
 *    다시 맨 위부터 Tab을 눌러야 하는 걸 막아요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop 챕터 지점
 * @param {string} props.date 고칠 글의 현지 날짜 YYYY-MM-DD
 * @param {import('@/types').Post | undefined} props.post 그 날짜의 글. 아직 없으면 undefined(빈 칸으로 시작해요)
 * @param {import('@/types').Photo[]} props.stopPhotos 지점의 사진(파일 이름·촬영 시각 포함)
 * @param {(photo: import('@/types').Photo) => void} props.onOpenPhoto 사진을 눌렀을 때
 * @param {() => void} props.onClose 저장하거나 취소한 뒤 불러요. 콜라주로 돌아가요
 */
export default function PostEditView({ stop, date, post, stopPhotos, onOpenPhoto, onClose }) {
  const ref = useRef(null);
  const photo = pickEditPhoto(post, stopPhotos, date);
  const dayNumber = getDayNumber(stop, date);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label="글 고치기"
      className={cn(
        FRAME_CLASS,
        'grid grid-cols-[minmax(0,1fr)_minmax(0,35rem)] items-start gap-10 px-30 pt-52 pb-20 outline-none',
      )}
    >
      <figure className="min-w-0">
        <CollagePhoto
          photo={photo}
          size="full"
          onOpen={() => onOpenPhoto(photo)}
          className="aspect-square w-full max-w-150"
        />
        {photo && (
          <figcaption className="mt-2.5 text-xs text-dim">
            {formatPhotoCaption(photo, stop.city)}
          </figcaption>
        )}
      </figure>
      <PostEditor key={date} date={date} dayNumber={dayNumber ?? undefined} onClose={onClose} />
    </section>
  );
}
