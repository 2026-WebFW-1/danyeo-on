/**
 * 05 영역 머리예요. 작은 영문 이름(VISAS) 아래 큰 한글 제목(입국 스탬프)을 두고, 오른쪽 끝에 안내나 범례를 둬요.
 *
 * 호출: 05의 VISAS · CALENDAR · RECORDS가 같이 써요. 오른쪽에 둘 게 없으면 children을 비워요.
 * <SectionHeading eyebrow="VISAS" title="입국 스탬프">스탬프를 누르면 …</SectionHeading>
 *
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} [props.titleId] 영역이 aria-labelledby로 제목을 가리킬 때 써요
 * @param {import('react').ReactNode} [props.children]
 */
export default function SectionHeading({ eyebrow, title, titleId, children }) {
  return (
    <div className="flex items-end justify-between whitespace-nowrap">
      <div className="flex flex-col gap-2">
        <p className="font-serif text-md font-bold text-muted">{eyebrow}</p>
        <h2 id={titleId} className="text-4xl font-bold text-ink">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
