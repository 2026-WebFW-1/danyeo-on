import { useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router';

import { useJourney } from '@/hooks/useJourney';
import { useLoadPosts } from '@/hooks/useLoadPosts';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePhotoNotes } from '@/hooks/usePhotoNotes';
import { usePostStore } from '@/stores/postStore';
import { selectChapterCollage } from '@/utils/chapterCollage';
import { findChapterBySlug, getNextStop, selectChapters } from '@/utils/chapters';
import { selectStopPhotos } from '@/utils/selectStopPhotos';
import { selectPostsOfStop } from '@/utils/tripStops';

import ChapterNotice from './ChapterNotice';
import ChapterView from './ChapterView';

const PLACES_PATH = '/places';

// 아직 못 구했을 때 쓰는 빈 값이에요. 같은 배열을 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_PHOTOS = [];
const NO_POSTS = [];
const NO_PHOTO_IDS = [];

/**
 * 02 챕터 페이지
 *
 * 책임: 주소의 slug로 챕터를 찾고, 그 지점의 글·사진·사진별 글을 읽어 ChapterView에 넘겨요.
 * 호출: App의 Routes가 /chapter/:slug 주소에서 그려요. 보호 화면이라 RequireAuth 안에 있어요.
 *
 * 의도:
 *  - 없는 주소거나 챕터가 아닌 지점이면 03 전체 기록으로 보내요(R109). 여행 기록을 다 받기 전에는 어느 slug도 없는 것처럼
 *    보이므로, journey가 ready가 된 뒤에만 없다고 판단해요(로딩 중에 보내면 새로고침할 때마다 03으로 튕겨요).
 *  - journey·사진을 못 읽으면 오류 안내만 보여요. 글(usePostStore)이나 사진별 글을 못 읽으면 그 부분(글 카드 또는 메모 카드)만 빼고 그려요.
 *  - 읽는 동안은 안내만 보여요. 크게 보는 사진 번호가 사진 목록 안의 자리라서, 목록이 도중에 바뀌면 같은 번호가 다른 사진을 가리켜요.
 *    콜라주에 올릴 사진은 글에 붙은 사진을 먼저 고르기 때문에, 글을 다 받은 뒤에야 어떤 사진의 글을 읽을지 정해져요.
 *    그래서 글도 받는 동안(성공이든 실패든 끝날 때까지)은 기다려요.
 *  - 사진별 글은 콜라주에 올릴 사진 것만 읽어요(전체를 읽을 필요가 없어요). 다른 화면과 나눠 쓰지 않아서 스토어를 쓰지 않아요.
 *  - 다른 챕터로 넘어가면(주소만 바뀌어요) 맨 위부터 보여요. [계속 여행하기]는 맨 아래에 있어서 그대로면 아래에 머물러요.
 *
 * @see ChapterView
 */
export default function ChapterPage() {
  const { slug } = useParams();
  const { journey, status: journeyStatus } = useJourney();
  const { photos: myPhotos, status: photosStatus } = useMyPhotos();
  const postsStatus = useLoadPosts();
  const postsByDate = usePostStore((state) => state.byDate);

  const stop = useMemo(() => findChapterBySlug(journey, slug), [journey, slug]);
  const stopId = stop?.id ?? null;
  const posts = useMemo(
    () => (stop ? selectPostsOfStop(journey, Object.values(postsByDate), stop.id) : NO_POSTS),
    [journey, postsByDate, stop],
  );
  const photos = useMemo(
    () => (stop ? selectStopPhotos(stop, myPhotos) : NO_PHOTOS),
    [stop, myPhotos],
  );

  // 글과 사진을 다 받기 전에 정하면 곧 바뀔 사진의 글을 읽게 돼서, 다 받은 뒤에만 읽을 사진을 정해요.
  const isPostsDone = postsStatus === 'ready' || postsStatus === 'error';
  const isReadyToPick = stop !== null && photosStatus === 'ready' && isPostsDone;
  const noteIds = useMemo(() => {
    if (!isReadyToPick) return NO_PHOTO_IDS;
    return selectChapterCollage({ stop, posts, photos }).photos.map((photo) => photo.id);
  }, [isReadyToPick, stop, posts, photos]);
  const { notes, status: notesStatus } = usePhotoNotes(noteIds);

  const chapter = useMemo(
    () => selectChapters(journey).find((item) => item.stop.id === stopId) ?? null,
    [journey, stopId],
  );
  const nextStop = useMemo(() => (stopId ? getNextStop(journey, stopId) : null), [journey, stopId]);

  // 다른 챕터로 바뀌면 맨 위부터 보여요. 아래의 [계속 여행하기]를 눌렀을 때 그대로 아래에 머물지 않게요.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stopId]);

  if (journeyStatus === 'error') {
    return <ChapterNotice role="alert">챕터를 불러오지 못했어요. 새로고침해 주세요.</ChapterNotice>;
  }
  if (journeyStatus === 'ready' && !stop) return <Navigate to={PLACES_PATH} replace />;
  if (photosStatus === 'error') {
    return <ChapterNotice role="alert">챕터를 불러오지 못했어요. 새로고침해 주세요.</ChapterNotice>;
  }

  const isLoading = !isReadyToPick || notesStatus === 'loading';
  if (isLoading) return <ChapterNotice role="status">챕터를 불러오는 중이에요</ChapterNotice>;

  return (
    <ChapterView
      key={stop.id}
      stop={stop}
      chapter={chapter}
      posts={posts}
      photos={photos}
      notes={notes}
      nextStop={nextStop}
    />
  );
}
