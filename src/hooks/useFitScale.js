import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 정해진 폭(designWidth)으로 그린 것을 화면 폭에 맞춰 줄일 배율을 줘요. 02 콜라주가 좌표로 놓여서 폭이 좁으면 잘리기 때문에,
 * 기준 폭대로 그린 뒤 이 배율로 줄여 보여 줘요. 배율은 1을 넘지 않아요(넓은 화면에서 키우지 않아요).
 *
 * const { ref, scale } = useFitScale(1440);
 * <div ref={ref} style={{ height: designHeight * scale }}>
 *   <div style={{ width: 1440, transform: `scale(${scale})`, transformOrigin: 'top left' }}>…</div>
 * </div>
 *
 * ref를 단 요소의 폭을 그리기 전에 한 번 재고, 그 뒤 폭이 바뀔 때마다(ResizeObserver) 배율을 다시 알려 줘요.
 * ResizeObserver만 쓰면 알림이 그린 뒤에 와서, 기준 폭 그대로인 화면이 한두 프레임 보였다가 줄어들어요.
 *
 * @param {number} designWidth 기준 폭(px)
 * @returns {{ ref: import('react').RefObject<HTMLElement | null>, scale: number }}
 */
export function useFitScale(designWidth) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const fit = (width) => setScale(Math.min(1, width / designWidth));
    fit(element.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [designWidth]);

  return { ref, scale };
}
