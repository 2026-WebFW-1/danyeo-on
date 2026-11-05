import StatRow from '@/components/common/StatRow';
import { TRIP_PARAM } from '@/constants/places';
import { formatTripStats } from '@/utils/formatTripStats';

import ArrowLink from './ArrowLink';
import { SECTION_CLASS } from './sectionClass';

/**
 * 고른 여행의 머리예요. 번호와 이름, 숫자 넷(기간 · 도시 · 이동 · 사진), 그 여행으로 가는 링크가 있어요.
 *
 * 호출: PlacesView가 고른 여행과 그 여행의 요약 숫자를 넘겨서 써요.
 * <TripSummary trip={trip} stats={stats} chapterSlug="밴쿠버-2025" />
 *
 * 의도: 피그마의 이 줄에는 전체 통계 · 함께한 사람 · 내보내기 링크가 있는데 모두 MVP 밖 화면(05·08·10)이라 뺐어요.
 * 그 자리에 기능 명세 R102의 [지도로 보기]와 [챕터 열기]를 같은 링크 모양으로 놓았어요.
 *
 * @param {object} props
 * @param {import('@/types').TripListItem} props.trip
 * @param {import('@/types').TripStats} props.stats
 * @param {string | null} props.chapterSlug 그 여행의 첫 챕터 주소. 챕터가 없으면 null이라 링크를 안 그려요
 */
export default function TripSummary({ trip, stats, chapterSlug }) {
  return (
    <section aria-label="여행 요약" className={SECTION_CLASS}>
      <div className="flex items-end justify-between pt-16">
        <div className="flex flex-col gap-2">
          <p className="font-serif text-md font-bold text-muted">TRIP {trip.no}</p>
          <h2 className="text-6xl font-bold tracking-[-0.02em] text-ink">{trip.name}</h2>
        </div>
        <StatRow items={formatTripStats(stats)} />
      </div>
      <div className="flex items-center justify-end gap-7 pt-5">
        <ArrowLink to={`/map?${TRIP_PARAM}=${encodeURIComponent(trip.id)}`} className="gap-1">
          지도로 보기
        </ArrowLink>
        {chapterSlug && (
          <ArrowLink to={`/chapter/${chapterSlug}`} className="gap-1">
            챕터 열기
          </ArrowLink>
        )}
      </div>
    </section>
  );
}
