import { cn } from '@/utils/cn';

// 03 여행 요약(summary)과 00 홈 숫자 줄(mini)은 숫자·이름 글꼴이 달라서 두 벌이에요.
const VARIANTS = {
  summary: {
    list: 'gap-10',
    value: 'font-serif text-4xl font-bold text-ink',
    label: 'text-sm text-muted',
  },
  mini: {
    list: 'gap-12',
    // 피그마가 줄 높이를 normal로 둬서 text-5xl의 1.1 대신 써요(숫자 높이 48px).
    value: 'font-serif text-5xl leading-[normal] text-ink italic',
    label: 'font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase',
  },
};

/**
 * 큰 숫자 위에 작은 이름을 둔 숫자 줄
 *
 * 호출: 숫자는 부르는 쪽이 글자(`13,210km`)로 만들어 넘겨요. 00 홈 모양은 variant="mini"예요.
 * <StatRow items={[{ value: '87일', label: '기간' }, { value: '4', label: '도시' }]} />
 *
 * 의도: "이름: 숫자" 순서(dt, dd)로 두고 flex-col-reverse로 숫자가 위에 보이게 해요.
 *
 * @param {object} props
 * @param {{ value: string, label: string }[]} props.items label은 key로 쓰니 겹치지 않게 해요
 * @param {'summary' | 'mini'} [props.variant]
 * @param {string} [props.className]
 */
export default function StatRow({ items, variant = 'summary', className }) {
  const style = VARIANTS[variant];

  return (
    <dl className={cn('flex items-start whitespace-nowrap', style.list, className)}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse gap-1">
          <dt className={style.label}>{item.label}</dt>
          <dd className={style.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
