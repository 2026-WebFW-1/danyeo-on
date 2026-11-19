import { useCorrectionStore } from '@/stores/correctionStore';
import { cn } from '@/utils/cn';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 머리 아래에 띄우는 Journey 다시 계산 상태예요. 계산 중이거나 실패했을 때만 그려요.
 *
 * 호출: MapPage
 *
 * 의도:
 *  - 이동 수단을 고쳐 완료하면 보정은 저장되고 Journey 계산은 뒤에서 돌아요(correctionStore).
 *    고친 값은 초안으로 먼저 보여서(useLegModeDraft), 계산이 실패해도 지도만 보면 저장된 것처럼 보여요.
 *    새로고침하면 옛 Journey가 나오니, 실패를 알리고 여기서 다시 계산할 수 있게 해요.
 *  - 07에서 고친 뒤 계산이 실패한 채 01로 와도 같은 상태라서 같이 알려요.
 *  - useCorrections는 보정 목록(my_data)을 불러와서, 지도를 열 때 부르지 않게 스토어에서 값만 꺼내요.
 *  - 07의 JourneyStatusNotice와 같은 문구지만, 지도 위에 떠야 해서 01 상자 모양으로 따로 그려요.
 */
export default function JourneyRefreshNotice() {
  const journeyStatus = useCorrectionStore((state) => state.journeyStatus);
  const refreshJourney = useCorrectionStore((state) => state.refreshJourney);

  if (journeyStatus !== 'building' && journeyStatus !== 'failed') return null;

  const isFailed = journeyStatus === 'failed';
  return (
    <div
      role={isFailed ? 'alert' : 'status'}
      className={cn(
        'absolute top-36 left-1/2 flex -translate-x-1/2 items-center gap-4 px-5 py-3 text-xs whitespace-nowrap text-body',
        PANEL_STYLE,
      )}
    >
      <p>
        {isFailed
          ? '여행을 다시 정리하지 못했어요. 고친 내용은 저장돼 있어요.'
          : '고친 내용을 지도에 반영하는 중…'}
      </p>
      {isFailed && (
        <button
          type="button"
          onClick={refreshJourney}
          className="bg-ink px-3 py-1.5 text-2xs font-bold text-white"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
