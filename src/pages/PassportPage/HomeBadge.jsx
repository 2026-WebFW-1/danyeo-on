import { cn } from '@/utils/cn';

/**
 * 05 집 칸의 작은 배지예요. 집이 어떻게 정해졌는지(자동 · 직접 지정)와 목록의 "지금 집"을 알려요.
 *
 * 호출: HomeSection의 도시 이름 옆, HomePicker의 지금 집 줄이 써요.
 * <HomeBadge isStrong>직접 지정한 집</HomeBadge>
 *
 * @param {object} props
 * @param {boolean} [props.isStrong] true면 검정 바탕 흰 글자(직접 지정). 아니면 paper 바탕
 * @param {import('react').ReactNode} props.children
 */
export default function HomeBadge({ isStrong = false, children }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 text-2xs font-medium whitespace-nowrap',
        isStrong ? 'bg-ink text-white' : 'bg-paper text-muted',
      )}
    >
      {children}
    </span>
  );
}
