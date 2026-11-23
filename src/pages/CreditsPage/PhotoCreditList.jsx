import ExternalLink from '@/components/common/ExternalLink';

/**
 * 데모 사진 출처 목록이에요. 한 줄에 제목(원본 링크) · 저작자 · 라이선스(링크)를 보여 줘요.
 *
 * 호출: CreditsPage
 *
 * 의도: CC BY · CC BY-SA는 제목 · 저작자 · 원본 · 라이선스를 같이 밝혀야 해서 네 가지를 한 줄에 둬요.
 *       저작자 이름이 긴 사진이 있어서 칸을 넘으면 줄이고, 전체는 title로 보여 줘요.
 *
 * @param {object} props
 * @param {import('@/types').PhotoCredit[]} props.credits
 */
export default function PhotoCreditList({ credits }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {credits.map((credit) => (
        <li
          key={credit.fileName}
          className="grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)_8rem] items-baseline gap-6 py-2 text-sm text-body"
        >
          <span className="truncate" title={credit.title}>
            {credit.sourceUrl ? (
              <ExternalLink href={credit.sourceUrl}>{credit.title}</ExternalLink>
            ) : (
              credit.title
            )}
          </span>
          <span className="truncate text-muted" title={credit.author}>
            {credit.author}
          </span>
          <span className="text-muted">
            {credit.licenseUrl ? (
              <ExternalLink href={credit.licenseUrl}>{credit.license}</ExternalLink>
            ) : (
              credit.license
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
