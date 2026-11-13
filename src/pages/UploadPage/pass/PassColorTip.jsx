import { cn } from '@/utils/cn';

/**
 * 사진 줄의 흰 카드와 색 카드가 무슨 뜻인지 알려 주는 범례예요. 카드를 작게 줄인 모양을 나란히 둬서
 * 문장을 읽지 않아도 비교로 알 수 있게 해요. 색 카드는 자리마다 색이 달라서 그라데이션으로 칠해요.
 *
 * 호출: PassPhotosStep 버튼 줄 아래에서 그려요.
 * <PassColorTip className="mt-6" />
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function PassColorTip({ className }) {
  return (
    <ul className={cn('flex flex-wrap items-center justify-center gap-x-10 gap-y-3', className)}>
      <li className="flex items-center gap-3 text-lg text-muted">
        <span aria-hidden="true" className="bg-white p-1 shadow-sm">
          <span className="block size-7 bg-line" />
        </span>
        일반 사진
      </li>
      <li className="flex items-center gap-3 text-lg text-muted">
        <span
          aria-hidden="true"
          className="bg-linear-to-br from-journey-start via-accent to-journey-end p-1"
        >
          <span className="block size-7 bg-line" />
        </span>
        편집본
      </li>
    </ul>
  );
}
