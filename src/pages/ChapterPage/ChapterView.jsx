import { useMemo, useState } from 'react';

import Lightbox from '@/components/common/Lightbox';
import { selectChapterCollage } from '@/utils/chapterCollage';
import { layoutCollage } from '@/utils/layoutCollage';
import { createSeed } from '@/utils/seededPick';
import { getContinueTarget } from '@/utils/stopPath';

import ChapterHeader from './ChapterHeader';
import Collage from './Collage';
import PostEditView from './PostEditView';

// 지점의 사진을 못 받았을 때 쓰는 빈 값이에요. 같은 배열을 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_STOP_PHOTOS = [];

/**
 * 02 챕터 화면을 그려요. 받은 값만 그리고 데이터는 읽지 않아요(읽는 건 ChapterPage예요).
 *
 * 호출: ChapterPage가 값을 다 읽은 뒤에 그려요. 챕터가 바뀌면 key를 바꿔서 새로 그려 주세요.
 * <ChapterView key={stop.id} stop={stop} chapter={chapter} posts={posts} photos={photos} stopPhotos={stopPhotos} notes={notes} nextStop={nextStop} />
 *
 * 의도:
 *  - 콜라주 칸은 피그마 02의 한 장면으로 정해져 있어서, 글이 많아도 화면이 늘어나지 않아요. 글·사진이 칸보다 많으면
 *    seed로 무작위로 골라 넣어요(selectChapterCollage). seed는 이 화면이 처음 그려질 때 한 번 만들어서, 들어올 때마다
 *    모양이 달라지고 머무는 동안은 그대로예요. 챕터가 바뀌면 key가 바뀌어 새 seed를 만들어요.
 *  - 크게 보는 사진 번호(openIndex)는 콜라주의 사진과 Lightbox의 가장 가까운 공통 부모인 여기가 들고 있어요.
 *    번호는 photos 안의 자리라서 photos가 도중에 바뀌면 다른 사진을 가리켜요. 그래서 ChapterPage가 값을 다 읽은 뒤에만 그려요.
 *  - 크게 볼 때 넘길 수 있는 사진은 콜라주에 올린 것만이 아니라 지점의 사진 전부예요.
 *  - 메모 카드는 제목 없는 짧은 글과 사진별 글 중에서 골라요. 사진별 글을 못 읽었으면(notes가 비어 있으면) 그 부분만 빠져요.
 *  - 글 카드를 누르면 같은 주소 안에서 콜라주 대신 글을 고치는 화면(PostEditView, 피그마 14a)이 열려요. 어느 날짜를 고치는지
 *    (editingDate)도 콜라주·Lightbox와 같은 부모인 여기가 들고 있어요. 콜라주를 가려도 seed와 크게 보는 사진 번호는 그대로라서,
 *    저장하거나 취소해 돌아오면 같은 모양이에요. 고치는 동안에는 콜라주 안에 있는 [계속 여행하기]도 같이 가려져요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop 챕터 지점
 * @param {import('@/types').ChapterItem} props.chapter 챕터 순번(no·total)
 * @param {import('@/types').Post[]} props.posts 지점의 글(날짜순)
 * @param {import('@/types').PhotoRef[]} props.photos 지점의 사진(시간 순서)
 * @param {import('@/types').Photo[]} [props.stopPhotos] 같은 사진을 파일 이름·촬영 시각까지 담은 것. 글 고치는 화면의 그날 사진에 써요
 * @param {Record<string, string>} props.notes 사진 id → 사진별 글 본문
 * @param {import('@/types').Stop | null} props.nextStop 같은 여행의 다음 지점. 없으면 null
 * @param {number} [props.seed] 무작위로 고르는 기준. 없으면 새로 만들어요(테스트에서 모양을 고정할 때만 넘겨요)
 */
export default function ChapterView({
  stop,
  chapter,
  posts,
  photos,
  stopPhotos = NO_STOP_PHOTOS,
  notes,
  nextStop,
  seed: fixedSeed,
}) {
  const [openIndex, setOpenIndex] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [visitSeed] = useState(createSeed);
  const seed = fixedSeed ?? visitSeed;

  const items = useMemo(
    () => layoutCollage(selectChapterCollage({ stop, posts, photos, notes, seed })),
    [stop, posts, photos, notes, seed],
  );
  const target = useMemo(() => getContinueTarget(stop, nextStop), [stop, nextStop]);

  const handleOpenPhoto = (photo) => {
    const index = photos.findIndex((candidate) => candidate.id === photo.id);
    if (index !== -1) setOpenIndex(index);
  };

  // 고치는 화면은 머리 아래에서 시작해서, 콜라주를 보던 자리에 머물면 안 보일 수 있어요. 맨 위부터 보여요.
  const handleEdit = (date) => {
    setEditingDate(date);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="relative flex-1 overflow-x-clip bg-canvas">
      <ChapterHeader stop={stop} chapter={chapter} />
      {editingDate === null ? (
        <Collage items={items} target={target} onOpenPhoto={handleOpenPhoto} onEdit={handleEdit} />
      ) : (
        <PostEditView
          stop={stop}
          date={editingDate}
          post={posts.find((post) => post.date === editingDate)}
          stopPhotos={stopPhotos}
          onOpenPhoto={handleOpenPhoto}
          onClose={() => setEditingDate(null)}
        />
      )}
      <Lightbox
        photos={photos}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onChange={setOpenIndex}
      />
    </main>
  );
}
