import RecordCard from './RecordCard';
import SectionHeading from './SectionHeading';
import { SECTION_CLASS } from './sectionClass';

/**
 * 05 RECORDS 기록 영역이에요. 가장 오래 머문 곳 · 가장 먼 곳 · 가장 많이 간 나라를 같은 폭의 카드로 나란히 놓아요.
 *
 * 호출: PassportView가 formatPassportRecords의 결과를 넘겨서 써요.
 * <RecordsSection cards={[{ label: 'LONGEST STAY', value: '밴쿠버 · 57일', … }, …]} />
 *
 * 의도:
 *  - 고를 수 없는 기록(집을 몰라서 거리를 못 재는 등)은 빼고 남은 카드만 놓아요. 하나도 없으면 영역째 그리지 않아요.
 *  - 피그마는 이 영역 아래를 120px 비워서, 화면 아래 여백(96px)에 24px을 더해요.
 *
 * @param {object} props
 * @param {import('@/types').PassportRecordCard[]} props.cards
 */
export default function RecordsSection({ cards }) {
  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby="passport-records"
      className={`${SECTION_CLASS} flex flex-col gap-6 pt-24 pb-6`}
    >
      <SectionHeading eyebrow="RECORDS" title="기록" titleId="passport-records" />
      <ul className="flex gap-8">
        {cards.map((card) => (
          <RecordCard key={card.label} card={card} />
        ))}
      </ul>
    </section>
  );
}
