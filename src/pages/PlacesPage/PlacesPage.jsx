import { useEffect, useMemo, useRef } from 'react';
import { useNavigationType, useSearchParams } from 'react-router';

import { TRIP_PARAM } from '@/constants/journey';
import { useJourney } from '@/hooks/useJourney';
import { useLoadPosts } from '@/hooks/useLoadPosts';
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
 *  - [+ 글 쓰기](#216)는 사진 목록을 다 받은 뒤에만 보여요. 그 전에 새 글을 쓰기 시작하면 그날 사진 없이 저장돼서요.
 *  - 글은 화면에 들어올 때 불러요(error로 남아 있으면 한 번 더 불러요. useLoadPosts).
 *  - 탭이나 아래 이전·다음 여행을 누르면 주소가 바뀌어요(뒤로 가기로 앞 여행에 돌아와요).
 *  - 여행이 바뀌면 그 여행부터 보이게 스크롤해요(#238). 주소에 ?trip=이 있으면 여행 탭 줄이 화면 맨 위에 와요.
 *    탭 · 이전·다음 여행과 다른 화면의 "이 여행 보기" 링크(02 · 01 도착 카드 · 00b · 사진 올린 뒤)가 여기에 해당해요.
 *    ?trip=이 없으면(위쪽 메뉴 Places 등) 맨 위 큰 제목부터 보여요. 뒤로·앞으로 가기는 브라우저가 전에 보던 자리로 돌려놔요.
 *
 * @see PlacesView
 */
export default function PlacesPage() {
  const { journey, status } = useJourney();
  const { photos, status: photoStatus } = useMyPhotos();
  const postsByDate = usePostStore((state) => state.byDate);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTripId = searchParams.get(TRIP_PARAM);
  // 여행 탭 줄이에요. 여행이 바뀌면 이 줄이 화면 맨 위에 오게 스크롤해요.
  const tabsRef = useRef(null);
  // 뒤로·앞으로 가기는 POP이에요. 주소를 새로 열거나 새로고침해도 POP이라, 이 화면에서 여행을 그렸는지도 기억해요.
  const navigationType = useNavigationType();
  const hasShownTripRef = useRef(false);

  useLoadPosts();

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
  const photosReady = photoStatus === 'ready';
  const blocks = useMemo(
    () => (currentId ? selectCityBlocks(journey, currentId, posts, photos, { photosReady }) : []),
    [journey, currentId, posts, photos, photosReady],
  );
  const daysUntilNext = useMemo(
    () => (currentId ? getDaysBetweenTrips(journey, currentId) : null),
    [journey, currentId],
  );

  // 여행이 바뀌면 ?trip=이 있을 때 여행 탭 줄부터, 없을 때 맨 위부터 보여요(#238).
  // 맨 위로만 올리면 [NEXT TRIP →]을 누를 때마다 큰 제목을 지나 다시 내려와야 새 여행이 보여서요.
  // 받는 중이거나 여행이 없으면 탭 줄이 없어서 맨 위로 가요.
  // 이 화면에서 여행을 그린 뒤의 뒤로·앞으로 가기는 건너뛰어요. 브라우저가 전에 보던 자리로 돌려놓는 걸 덮어쓰지 않게요.
  useEffect(() => {
    if (navigationType === 'POP' && hasShownTripRef.current) return;
    if (currentId) hasShownTripRef.current = true;

    if (requestedTripId && tabsRef.current) {
      tabsRef.current.scrollIntoView({ block: 'start' });
      return;
    }
    window.scrollTo({ top: 0 });
  }, [currentId, requestedTripId, navigationType]);

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
      tabsRef={tabsRef}
    />
  );
}
