import { formatPassDate } from '@/utils/upload/pass/formatPassDate';

/**
 * 사진 줄 아래 한 줄이에요. 왼쪽에 지금 날짜, 가운데에 [일시정지]·[되돌리기], 오른쪽에 안내를 둬요.
 *
 * 호출: PassPhotosStep 사진 줄 아래에서 그려요.
 * <PassControls takenAt="2024-07-03T10:15:42" isPaused={false} isFirst isLast={false} onPause={...} onUndo={...} />
 *
 * @param {object} props
 * @param {string | null} [props.takenAt] 지금 사진의 촬영 시각. 없으면 날짜 자리에 --.--를 둬요
 * @param {boolean} props.isPaused 멈춰 있으면 [다시 재생]을 보여 줘요
 * @param {boolean} props.isFirst 첫 장이면 더 되돌릴 곳이 없어서 [되돌리기]를 막아요
 * @param {boolean} props.isLast 마지막 장이면 더 넘어갈 곳이 없어서 [일시정지]를 막아요
 * @param {() => void} props.onPause 멈춰 있을 때 누르면 다시 재생돼요
 * @param {() => void} props.onUndo 이전 사진으로 돌아가요
 */
export default function PassControls({ takenAt, isPaused, isFirst, isLast, onPause, onUndo }) {
  return (
    // 양옆 칸을 1fr로 같게 둬서 버튼이 사진 줄 가운데(지금 사진) 바로 아래에 와요.
    <div className="mt-6 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <strong className="font-mono text-4xl font-medium text-ink">{formatPassDate(takenAt)}</strong>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPause}
          disabled={isLast}
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-nav px-6 text-md font-bold text-white transition-colors hover:bg-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-current">
            {isPaused ? (
              <path d="M6 3.5v13l10.5-6.5z" />
            ) : (
              <>
                <rect x="5" y="3" width="3" height="14" rx="1" />
                <rect x="12" y="3" width="3" height="14" rx="1" />
              </>
            )}
          </svg>
          {isPaused ? '다시 재생' : '일시정지'}
        </button>
        <button
          type="button"
          aria-label="방금 것 되돌리기"
          onClick={onUndo}
          disabled={isFirst}
          className="inline-flex h-11 items-center gap-2 rounded-pill px-4 text-md font-medium text-muted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M7 4 3 8l4 4M3 8h8a5 5 0 0 1 0 10" />
          </svg>
          되돌리기
        </button>
      </div>
      {/* 끌어서 옮기기는 기능 동결(11/29) 전에 만들기엔 커서 빼고, 있는 동작만 알려요(#204) */}
      <p className="text-xs text-dim sm:text-right">되돌리면 멈춘 채로 앞 사진을 볼 수 있어요</p>
    </div>
  );
}
