import { useEffect, useMemo, useRef } from 'react';

import PostEditor from '@/components/post/PostEditor';
import { getDayNumber, selectPhotosOfDate } from '@/utils/chapterEdit';

/**
 * 03 도시 블록의 글 칸 안에 펼치는 글 편집기예요(#216, 피그마 03 "날짜를 고르면 글 칸 안에 편집기가 펼쳐짐").
 *
 * 책임: 고른 날짜의 Day N과 그날 사진을 골라 D의 PostEditor에 넘겨요. 저장 · 취소 · 지우기는 PostEditor가 하고 onClose를 불러요.
 * 호출: CityBlock이 [+ 글 쓰기]에서 고른 날짜로 그려요. 날짜가 바뀌면 key={date}로 새로 그려서 쓰던 내용이 넘어가지 않아요.
 * <StopPostEditor key={date} stop={stop} date={date} hasPost={hasPost} photoDetails={block.photoDetails} onClose={handleClose} />
 *
 * 의도:
 *  - 폭은 글 칸과 같아요(1280 · 1440px 창 420px, 1024px 창 약 330px). 편집기는 폭에 맞춰 줄어들어서 따로 고치지 않았어요.
 *  - 화면 이름(aria-label)은 02의 PostEditView와 같아요. 글이 있으면 "글 고치기", 아직 없으면 "글 쓰기"예요.
 *  - 열리면 이 칸으로 포커스를 옮겨요. 날짜 목록이 닫히면서 포커스가 몸통으로 떨어져서, 키보드 사용자가
 *    다시 맨 위부터 Tab을 눌러야 하는 걸 막아요. 방금 누른 [+ 글 쓰기] 바로 아래라 화면은 움직이지 않아요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop
 * @param {string} props.date 고른 현지 날짜 YYYY-MM-DD
 * @param {boolean} props.hasPost 그 날짜에 글이 이미 있는지
 * @param {import('@/types').Photo[]} props.photoDetails 지점의 사진(파일 이름 · 촬영 시각 포함)
 * @param {() => void} props.onClose 저장 · 취소 · 지우기 뒤에 불러요
 */
export default function StopPostEditor({ stop, date, hasPost, photoDetails, onClose }) {
  const ref = useRef(null);
  const dayPhotos = useMemo(() => selectPhotosOfDate(photoDetails, date), [photoDetails, date]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={hasPost ? '글 고치기' : '글 쓰기'}
      className="mt-2 outline-none"
    >
      <PostEditor
        date={date}
        dayNumber={getDayNumber(stop, date) ?? undefined}
        dayPhotos={dayPhotos}
        onClose={onClose}
      />
    </section>
  );
}
