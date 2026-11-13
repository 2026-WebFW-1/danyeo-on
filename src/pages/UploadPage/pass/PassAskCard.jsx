import { cn } from '@/utils/cn';

/**
 * 줄 위로 띄운 사진 옆에서 자리를 못 찾은 이유를 알려 주고 답을 받는 카드예요(13k″ ②를 13i″ 모양으로).
 * 두 버튼 모두 답으로 쳐서, 누르면 다음 질문으로 넘어가요.
 *
 * 호출: PassPhotosStep이 줄이 끝난 뒤 물어볼 사진이 남아 있으면 사진 줄 옆에 그려요.
 * <PassAskCard photo={photo} step={1} total={3} onAnswer={(answer) => ...} />
 *
 * @param {object} props
 * @param {import('@/types').PilePhoto} props.photo 지금 묻는 사진
 * @param {number} props.step 몇 번째 질문인지(1부터)
 * @param {number} props.total 전체 질문 수
 * @param {(answer: 'exclude' | 'later') => void} props.onAnswer
 * @param {string} [props.className]
 */
export default function PassAskCard({ photo, step, total, onAnswer, className }) {
  return (
    <section
      aria-label={`질문 ${step} / ${total}`}
      className={cn('w-full max-w-96 bg-white p-5 shadow-md', className)}
    >
      <p className="flex items-baseline justify-between gap-3">
        <strong className="truncate font-mono text-md font-medium text-ink">
          {photo.filename}
        </strong>
        <span className="shrink-0 font-mono text-sm text-dim">
          {step} / {total}
        </span>
      </p>
      <p className="mt-2 text-sm break-keep text-muted">날짜도 번호도 없어서 자리를 못 찾았어요.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onAnswer('exclude')}
          className="inline-flex h-10 items-center bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          빼 두기
        </button>
        <button
          type="button"
          onClick={() => onAnswer('later')}
          className="inline-flex h-10 items-center border border-ink px-4 text-sm font-medium text-ink transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          나중에
        </button>
      </div>
    </section>
  );
}
