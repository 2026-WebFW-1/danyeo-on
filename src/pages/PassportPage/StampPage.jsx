import Stamp from './Stamp';
import { STAMP_SLOTS } from './stampSlots';

/**
 * 여권 한 쪽이에요. 줄 쳐진 종이 위에 흐린 "MY JOURNEY"를 깔고, 스탬프를 정해진 자리(STAMP_SLOTS)에 찍어요.
 *
 * 호출: StampSection이 스탬프를 10개씩 나눠 넘겨요.
 * <StampPage stamps={stamps.slice(0, 10)} pageNo={1} />
 *
 * 의도: 가로줄은 피그마처럼 19px부터 36px마다 하나예요. 줄 18개를 요소로 두지 않고 배경 무늬 하나로 그려요.
 *
 * @param {object} props
 * @param {import('@/types').PassportStamp[]} props.stamps 10개 이하
 * @param {number} props.pageNo
 */
export default function StampPage({ stamps, pageNo }) {
  return (
    <div className="relative h-160 overflow-hidden border border-line bg-paper bg-[repeating-linear-gradient(to_bottom,transparent_0_19px,color-mix(in_srgb,var(--color-line)_60%,transparent)_19px_20px,transparent_20px_36px)]">
      <p
        aria-hidden="true"
        className="absolute inset-x-0 top-[219px] text-center font-serif text-hero leading-normal font-bold tracking-[6px] whitespace-nowrap text-ink/4"
      >
        MY JOURNEY
      </p>
      <ol>
        {stamps.map((stamp, index) => (
          <li key={stamp.cc} className={`absolute ${STAMP_SLOTS[index].className}`}>
            <Stamp stamp={stamp} shape={STAMP_SLOTS[index].shape} />
          </li>
        ))}
      </ol>
      <p className="absolute inset-x-0 top-[605px] text-center font-serif text-md leading-normal text-dim italic">
        — {pageNo} —
      </p>
    </div>
  );
}
