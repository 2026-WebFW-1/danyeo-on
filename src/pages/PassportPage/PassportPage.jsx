import { useMemo, useState } from 'react';

import { useJourney } from '@/hooks/useJourney';
import { getLocalToday, selectPassportCalendar } from '@/utils/passportCalendar';
import { selectPassportStamps } from '@/utils/passportStamps';
import { selectPassportStats } from '@/utils/passportStats';

import PassportView from './PassportView';

/**
 * 05 Passport 페이지
 *
 * 책임: 로그인한 사람의 Journey를 읽어 통계와 입국 스탬프로 계산하고 PassportView에 넘겨요.
 * 호출: App의 Routes가 /passport 주소에서 그려요. 보호 화면이라 RequireAuth 안에 있어요.
 *
 * 의도: 이 화면은 Journey만 봐요(사진 파일·글은 안 읽어요). 숫자는 00·03과 같은 selectJourneyTotals에서 나와요.
 *
 * @see PassportView
 */
export default function PassportPage() {
  const { journey, status } = useJourney();

  const stats = useMemo(() => selectPassportStats(journey), [journey]);
  const stamps = useMemo(() => selectPassportStamps(journey), [journey]);
  // 오늘은 화면을 연 날로 한 번만 정해요. 렌더마다 다시 읽으면 자정을 넘길 때 캘린더가 혼자 바뀌어요.
  const [today] = useState(getLocalToday);
  const calendar = useMemo(() => selectPassportCalendar(journey, today), [journey, today]);

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

  return <PassportView journey={journey} stats={stats} stamps={stamps} calendar={calendar} />;
}
