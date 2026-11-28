import { SECTION_CLASS } from './sectionClass';

/**
 * 보정을 저장한 뒤 Journey를 다시 계산하는 상태를 알려 주는 줄이에요. 계산 중이거나 실패했을 때만 그려요.
 *
 * 호출: PhotoSortPage가 useCorrections의 journeyStatus와 refreshJourney를 넘겨요.
 * <JourneyStatusNotice status={journeyStatus} onRetry={refreshJourney} />
 *
 * 의도:
 *  - 첫 계산이 20초쯤 걸려요(#151). 그동안 07의 표는 보정 목록으로 덮어 보여 줘서 바로 바뀌지만,
 *    01 · 02 · 03은 계산이 끝나야 바뀌어서 그 사실을 알려요.
 *  - 실패해도 보정은 저장돼 있어요. [다시 시도]는 Journey 계산만 다시 해요(refreshJourney는 던지지 않아요).
 *  - 피그마에 이 줄의 디자인이 없어서 07a 경유 감지 안내(callout)와 같은 흰 상자로 그려요.
 *
 * @param {object} props
 * @param {'idle' | 'building' | 'saved' | 'failed'} props.status
 * @param {() => void} props.onRetry
 * @param {boolean} [props.canRetry] 사진을 모두 지우는 중이면 false예요. 그때 다시 계산하면 지우기 전 사진으로 옛 Journey를 써요
 */
export default function JourneyStatusNotice({ status, onRetry, canRetry = true }) {
  if (status === 'building') {
    return (
      <div className={`${SECTION_CLASS} pt-10`}>
        <p role="status" className="border border-line bg-white px-8 py-5 text-md text-body">
          여행을 정리하는 중… 고친 내용을 지도와 전체 기록에 반영하고 있어요.
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`${SECTION_CLASS} pt-10`}>
        <div
          role="alert"
          className="flex items-center justify-between border border-line bg-white px-8 py-4"
        >
          <p className="text-md text-body">
            여행을 다시 정리하지 못했어요. 고친 내용은 저장돼 있어요.
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={!canRetry}
            className="bg-ink px-5 py-2.5 text-md font-bold text-white disabled:bg-dim"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return null;
}
