import NoTripsNotice from '@/components/common/NoTripsNotice';
import { formatPassportHeader } from '@/utils/formatPassportHeader';
import { formatPassportRecords } from '@/utils/passportRecords';
import { formatPassportStats } from '@/utils/passportStats';

import CalendarSection from './CalendarSection';
import HomeSection from './HomeSection';
import PassportIntro from './PassportIntro';
import PassportStats from './PassportStats';
import RecordsSection from './RecordsSection';
import StampSection from './StampSection';

/**
 * 05 Passport 화면. 여행을 여권처럼 모아, 통계와 나라별 입국 스탬프를 보여 줘요.
 *
 * 책임: 받은 값만 그려요. 데이터를 읽는 건 PassportPage가 해요(코드 컨벤션 4·5절). 집 칸(HomeSection)만 보정을 저장해서 스스로 훅을 불러요.
 * 호출: PassportPage가 계산해 둔 값을 넘겨서 써요.
 * <PassportView journey={journey} stats={stats} stamps={stamps} calendar={calendar} records={records} />
 *
 * 의도:
 *  - 여행이 하나도 없으면 머리 없이 집 칸과 15a와 같은 안내를 보여요(03 R110과 같아요). 집 칸에서 사진을 올리라고 안내해요.
 *  - 피그마 순서대로 머리말 · 통계 · 집 · 입국 스탬프 · 여행 캘린더 · 기록을 위에서 아래로 놓아요(#174).
 *
 * @param {object} props
 * @param {import('@/types').Journey | null} props.journey 머리말의 기간을 셀 때 써요
 * @param {import('@/types').PassportStats} props.stats
 * @param {import('@/types').PassportStamp[]} props.stamps
 * @param {import('@/types').PassportCalendar} props.calendar
 * @param {import('@/types').PassportRecords} props.records
 */
export default function PassportView({ journey, stats, stamps, calendar, records }) {
  const header = formatPassportHeader(journey, { stamps: stamps.length, ...stats });

  if (!header) {
    return (
      <main className="flex flex-1 flex-col bg-canvas pb-20">
        <h1 className="sr-only">PASSPORT</h1>
        <HomeSection journey={journey} className="pt-20" />
        <div className="flex flex-1 items-center justify-center px-30 pt-20">
          <NoTripsNotice />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-canvas pb-24">
      <PassportIntro header={header} />
      <PassportStats items={formatPassportStats(stats)} />
      <HomeSection journey={journey} />
      <StampSection stamps={stamps} />
      <CalendarSection calendar={calendar} />
      <RecordsSection cards={formatPassportRecords(records)} />
    </main>
  );
}
