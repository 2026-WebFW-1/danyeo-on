import { Fragment } from 'react';

import { cn } from '@/utils/cn';

// 버튼을 누르면 사진이 어떻게 되는지예요. 버튼 순서와 같게 둬요.
const ANSWER_RESULTS = [
  { label: '빼 두기', result: '이번 기록에 넣지 않아요.' },
  { label: '나중에', result: '고른 순서 자리에 그대로 두고, 사진 정리에서 바꿀 수 있어요.' },
];

/**
 * 줄 위로 띄운 사진 옆에서 자리를 못 찾은 이유를 알려 주고 답을 받는 카드예요(13k″ ②를 13i″ 모양으로).
 * 두 버튼 모두 답으로 쳐서, 누르면 다음 질문으로 넘어가요.
 * 크기는 부르는 쪽이 정해요. 버튼은 카드 아래쪽에 붙어요.
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
      className={cn('flex flex-col bg-white p-8 shadow-md', className)}
    >
      <p className="flex items-baseline justify-between gap-4">
        <strong className="truncate font-mono text-3xl font-medium text-ink">
          {photo.filename}
        </strong>
        <span className="shrink-0 font-mono text-xl text-dim">
          {step} / {total}
        </span>
      </p>
      <p className="mt-3 text-xl break-keep text-muted">날짜도 번호도 없어서 자리를 못 찾았어요.</p>
      {/* 누르기 전에 결과를 알 수 있게 버튼마다 어떻게 되는지 적어 둬요 */}
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-lg">
        {ANSWER_RESULTS.map(({ label, result }) => (
          <Fragment key={label}>
            <dt className="font-bold text-ink">{label}</dt>
            <dd className="break-keep text-muted">{result}</dd>
          </Fragment>
        ))}
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onAnswer('exclude')}
          className="inline-flex h-14 items-center bg-ink px-8 text-xl font-bold text-white transition-colors hover:bg-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          빼 두기
        </button>
        <button
          type="button"
          onClick={() => onAnswer('later')}
          className="inline-flex h-14 items-center border border-ink px-8 text-xl font-medium text-ink transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          나중에
        </button>
      </div>
    </section>
  );
}
