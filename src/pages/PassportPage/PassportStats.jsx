import { SECTION_CLASS } from './sectionClass';

/**
 * 05 통계 6칸이에요. 위아래 가는 선 사이에 KM · FLIGHTS · HOURS · DAYS AWAY · COUNTRIES · PHOTOS가 같은 폭으로 놓여요.
 *
 * 호출: PassportView가 formatPassportStats의 결과를 넘겨서 써요.
 * <PassportStats items={[{ label: 'KM', value: '72,492', note: '지구 1.8바퀴' }, …]} />
 *
 * 의도: "이름: 숫자" 순서(dt, dd)로 두고 order로 숫자를 위에 보이게 해요. 화면 읽기는 KM 48,210 지구 1.2바퀴 순서예요.
 * StatRow는 칸 사이 선과 아래 설명 줄이 없어서 따로 만들었어요.
 *
 * @param {object} props
 * @param {{ label: string, value: string, note: string }[]} props.items
 */
export default function PassportStats({ items }) {
  return (
    <section aria-label="여행 통계" className={`${SECTION_CLASS} pt-18`}>
      <dl className="flex border-y border-line py-8 whitespace-nowrap">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col gap-1 border-line not-first:border-l not-first:pl-7"
          >
            <dt className="order-2 font-serif text-2xs font-bold tracking-[0.2em] text-accent uppercase">
              {item.label}
            </dt>
            <dd className="order-1 font-serif text-6xl font-bold tracking-[-0.02em] text-ink">
              {item.value}
            </dd>
            <dd className="order-3 text-sm text-muted">{item.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
