import NoTripsNotice from '@/components/common/NoTripsNotice';
import { formatJourneyIntro } from '@/utils/formatJourneyIntro';

import PlacesIntro from './PlacesIntro';
import TripLine from './TripLine';
import TripPager from './TripPager';
import TripSummary from './TripSummary';
import TripTabs from './TripTabs';

const NO_NEW_TRIPS = [];

/**
 * 03 전체 기록 화면. 여행을 탭으로 하나 골라, 그 여행의 도시를 위에서 아래로 따라 읽어요.
 *
 * 책임: 받은 값만 그려요. 데이터를 읽거나 주소를 다루는 건 PlacesPage가 해요(코드 컨벤션 4·5절).
 * 호출: PlacesPage가 계산해 둔 값을 넘겨서 써요.
 * <PlacesView totals={totals} trips={trips} current={current} … onSelectTrip={handleSelectTrip} />
 *
 * 의도:
 *  - 여행이 하나도 없으면 머리 없이 15a와 같은 안내만 보여요(R110).
 *  - 여행을 바꾸면 TripLine이 새로 시작해요(key). 이전 여행에서 펼쳤거나 열어 둔 사진이 남지 않게요.
 *  - 피그마의 검은 배경 "Every stop, stacked." 안은 MVP 밖이라 만들지 않았어요(기능 명세 §6 확인 11번).
 *
 * @param {object} props
 * @param {import('@/types').JourneyTotals} props.totals 머리의 한 줄 요약에 써요
 * @param {import('@/types').TripListItem[]} props.trips
 * @param {import('@/types').TripListItem | null} props.current 지금 보는 여행. 여행이 없으면 null
 * @param {import('@/types').TripListItem | null} props.prev
 * @param {import('@/types').TripListItem | null} props.next
 * @param {import('@/types').TripStats | null} props.stats 지금 보는 여행의 요약 숫자
 * @param {import('@/utils/cityBlocks').CityBlock[]} props.blocks 지금 보는 여행의 도시 블록
 * @param {number | null} props.daysUntilNext 다음 여행까지 며칠
 * @param {string[]} [props.newTripIds] 새로 생긴 여행의 id. NEW 칩을 달아요
 * @param {(tripId: string) => void} props.onSelectTrip
 */
export default function PlacesView({
  totals,
  trips,
  current,
  prev,
  next,
  stats,
  blocks,
  daysUntilNext,
  newTripIds = NO_NEW_TRIPS,
  onSelectTrip,
}) {
  if (!current || !stats) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-30 py-20">
        <h1 className="sr-only">PLACES</h1>
        <NoTripsNotice />
      </main>
    );
  }

  const chapterBlock = blocks.find((block) => block.stop.chapter && block.stop.slug);

  return (
    <main className="flex-1 bg-canvas">
      <PlacesIntro intro={formatJourneyIntro(totals)} />
      <TripTabs
        trips={trips}
        currentId={current.id}
        newTripIds={newTripIds}
        onSelect={onSelectTrip}
      />
      <TripSummary trip={current} stats={stats} chapterSlug={chapterBlock?.stop.slug ?? null} />
      <TripLine key={current.id} blocks={blocks} />
      <TripPager prev={prev} next={next} daysUntilNext={daysUntilNext} onSelect={onSelectTrip} />
    </main>
  );
}
