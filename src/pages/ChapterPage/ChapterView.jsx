import { useMemo, useState } from 'react';

import Lightbox from '@/components/common/Lightbox';
import { selectChapterCollage } from '@/utils/chapterCollage';
import { layoutCollage } from '@/utils/layoutCollage';
import { getContinueTarget } from '@/utils/stopPath';

import ChapterHeader from './ChapterHeader';
import Collage from './Collage';

/**
 * 02 챕터 화면을 그려요. 받은 값만 그리고 데이터는 읽지 않아요(읽는 건 ChapterPage예요).
 *
 * 호출: ChapterPage가 값을 다 읽은 뒤에 그려요. 챕터가 바뀌면 key를 바꿔서 새로 그려 주세요.
 * <ChapterView key={stop.id} stop={stop} chapter={chapter} posts={posts} photos={photos} notes={notes} nextStop={nextStop} />
 *
 * 의도:
 *  - 크게 보는 사진 번호(openIndex)는 콜라주의 사진과 Lightbox의 가장 가까운 공통 부모인 여기가 들고 있어요.
 *    번호는 photos 안의 자리라서 photos가 도중에 바뀌면 다른 사진을 가리켜요. 그래서 ChapterPage가 값을 다 읽은 뒤에만 그려요.
 *  - 크게 볼 때 넘길 수 있는 사진은 콜라주에 올린 것만이 아니라 지점의 사진 전부예요.
 *  - 메모 카드는 제목 없는 짧은 글을 먼저, 모자라면 콜라주에 올린 사진의 사진별 글로 채워요.
 *    사진별 글을 못 읽었으면(notes가 비어 있으면) 그 부분만 빠져요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop 챕터 지점
 * @param {import('@/types').ChapterItem} props.chapter 챕터 순번(no·total)
 * @param {import('@/types').Post[]} props.posts 지점의 글(날짜순)
 * @param {import('@/types').PhotoRef[]} props.photos 지점의 사진(시간 순서)
 * @param {Record<string, string>} props.notes 사진 id → 사진별 글 본문
 * @param {import('@/types').Stop | null} props.nextStop 같은 여행의 다음 지점. 없으면 null
 */
export default function ChapterView({ stop, chapter, posts, photos, notes, nextStop }) {
  const [openIndex, setOpenIndex] = useState(null);

  const collage = useMemo(
    () => selectChapterCollage({ stop, posts, photos }),
    [stop, posts, photos],
  );
  const layout = useMemo(() => {
    const postMemos = collage.memoPosts.map((post) => ({ id: post.id, text: post.body }));
    const photoMemos = collage.photos.flatMap((photo) =>
      notes[photo.id] ? [{ id: `note-${photo.id}`, text: notes[photo.id] }] : [],
    );

    return layoutCollage({
      hero: collage.hero,
      cards: collage.cards,
      memos: [...postMemos, ...photoMemos],
      photos: collage.photos,
      stickers: collage.stickers,
    });
  }, [collage, notes]);
  const target = useMemo(() => getContinueTarget(stop, nextStop), [stop, nextStop]);

  const handleOpenPhoto = (photo) => {
    const index = photos.findIndex((candidate) => candidate.id === photo.id);
    if (index !== -1) setOpenIndex(index);
  };

  return (
    <main className="relative flex-1 overflow-x-clip bg-canvas">
      <ChapterHeader stop={stop} chapter={chapter} />
      <Collage layout={layout} target={target} onOpenPhoto={handleOpenPhoto} />
      <Lightbox
        photos={photos}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onChange={setOpenIndex}
      />
    </main>
  );
}
