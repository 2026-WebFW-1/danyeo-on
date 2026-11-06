import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { TRIP_PARAM } from '@/constants/journey';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePostStore } from '@/stores/postStore';
import { selectCityBlocks } from '@/utils/cityBlocks';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { selectTripPage } from '@/utils/tripPager';
import { getDaysBetweenTrips } from '@/utils/tripStops';
import { selectTripStats, selectTrips } from '@/utils/trips';

import PlacesView from './PlacesView';

/**
 * 03 전체 기록 페이지
 *
 * 책임: 여행·사진·글을 읽어 PlacesView가 그릴 값으로 계산하고, 고른 여행을 주소(?trip=)에 남겨요.
 * 호출: App의 Routes가 /places 주소에서 그려요. 보호 화면이라 RequireAuth 안에 있어요.
 *
 * 의도:
 *  - 고른 여행은 ?trip=<여행 id>예요(여행 id는 그 여행 첫 사진의 id). 새로고침하거나 주소를 나눠도 같은 여행이 보여요.
 *    값이 없거나 없는 id면 첫 여행을 보여 줘요. 로딩 중에는 여행 목록이 비어 있어서 어느 id도 없는 것처럼 보이므로,
 *    journey가 ready가 된 뒤에만 여행을 골라요.
 *  - 글은 D의 usePostStore, 사진은 useMyPhotos예요. 둘 다 아직 못 받았거나 실패해도 도시 블록은 그려요.
 *    글 자리는 비고 사진 칸은 대표 사진만(없으면 회색)이에요.
 *  - 글은 화면에 들어올 때 불러요. 스토어의 error는 계정이 바뀔 때까지 남아서, 다시 들어와도 안 부르면 새로고침하기 전까지
 *    글이 계속 비어요. 그래서 error로 남아 있어도 들어올 때 한 번 더 불러요.
 *  - 탭을 누르면 주소가 바뀌고(뒤로 가기로 앞 탭에 돌아와요), 아래 이전·다음 여행을 눌러도 맨 위로 올라가요.
 *
 * @see PlacesView
 */
export default function PlacesPage() {
  const { journey, status } = useJourney();
  const { photos } = useMyPhotos();
  const postsStatus = usePostStore((state) => state.status);
  const postsByDate = usePostStore((state) => state.byDate);
  const fetchPosts = usePostStore((state) => state.fetch);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTripId = searchParams.get(TRIP_PARAM);

  // 아직 안 불렀거나(idle), 계정이 바뀌어 글이 처음 상태로 돌아갔으면 불러와요.
  useEffect(() => {
    if (postsStatus === 'idle') fetchPosts();
  }, [postsStatus, fetchPosts]);

  // 지난번에 실패해서 error로 남아 있으면 들어올 때 한 번 더 불러와요.
  // error를 계속 지켜보면 계속 실패할 때 요청이 반복돼서, 들어올 때 한 번만 봐요(fetchPosts는 바뀌지 않아요).
  useEffect(() => {
    if (usePostStore.getState().status === 'error') fetchPosts();
  }, [fetchPosts]);

  const posts = useMemo(() => Object.values(postsByDate), [postsByDate]);
  const trips = useMemo(() => selectTrips(journey), [journey]);
  const totals = useMemo(() => selectJourneyTotals(journey), [journey]);
  const { current, prev, next } = useMemo(
    () => selectTripPage(trips, requestedTripId),
    [trips, requestedTripId],
  );
  const currentId = current?.id ?? null;
  const stats = useMemo(
    () => (currentId ? selectTripStats(journey, currentId) : null),
    [journey, currentId],
  );
  const blocks = useMemo(
    () => (currentId ? selectCityBlocks(journey, currentId, posts, photos) : []),
    [journey, currentId, posts, photos],
  );
  const daysUntilNext = useMemo(
    () => (currentId ? getDaysBetweenTrips(journey, currentId) : null),
    [journey, currentId],
  );

  // 다른 여행으로 바뀌면 맨 위부터 보여요. 아래의 이전·다음 여행을 눌렀을 때 그대로 아래에 머물지 않게요.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentId]);

  if (status === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas">
        <p role="status" className="text-lg text-muted">
          여행 기록을 불러오는 중이에요
        </p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas">
        <p role="alert" className="text-lg text-body">
          여행 기록을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      </main>
    );
  }

  const handleSelectTrip = (tripId) => {
    setSearchParams({ [TRIP_PARAM]: tripId });
  };

  return (
    <PlacesView
      totals={totals}
      trips={trips}
      current={current}
      prev={prev}
      next={next}
      stats={stats}
      blocks={blocks}
      daysUntilNext={daysUntilNext}
      onSelectTrip={handleSelectTrip}
    />
  );
}
