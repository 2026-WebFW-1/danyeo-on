import { useEffect, useRef, useState } from 'react';

// 요소가 이만큼 보이면 나타나요.
const REVEAL_THRESHOLD = 0.15;

/** 떠오르는 움직임을 써도 되는지 알려 줘요. 움직임 줄이기 설정이나 관찰 기능이 없으면 쓰지 않아요. */
function canAnimate() {
  return (
    typeof IntersectionObserver === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * 화면에 들어오면 한 번 켜지는 값을 줘요. 03 도시 블록이 스크롤하면 위에서부터 하나씩 떠오르는 효과에 써요.
 * 한 번 켜지면 다시 숨지 않아요. 움직임 줄이기 설정이거나 IntersectionObserver가 없으면 처음부터 켜져 있어요.
 *
 * const { ref, isRevealed } = useReveal();
 * <div ref={ref} className={cn('transition', !isRevealed && 'translate-y-6 opacity-0')}>
 *
 * @returns {{ ref: import('react').RefObject<HTMLElement | null>, isRevealed: boolean }}
 */
export function useReveal() {
  const ref = useRef(null);
  const [isRevealed, setIsRevealed] = useState(() => !canAnimate());

  useEffect(() => {
    const element = ref.current;
    if (isRevealed || !element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold: REVEAL_THRESHOLD },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isRevealed]);

  return { ref, isRevealed };
}
