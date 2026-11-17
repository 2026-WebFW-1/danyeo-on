import { useEffect, useRef, useState } from 'react';

// 화면에 들어오기 이만큼 전에 켜요. 스크롤하다 보면 사진이 이미 와 있게요.
const IN_VIEW_MARGIN = '400px 0px';

/**
 * 요소가 화면 가까이 오면 한 번 켜지는 값을 줘요. 켜진 뒤에는 다시 꺼지지 않아요.
 * 07a 여행 표가 화면 밖 줄의 썸네일을 그리지 않을 때 써요. 올린 사진은 칸마다 서명 주소를 받아서,
 * 여행이 많으면(heavy 59개) 들어오자마자 요청이 몰려요. <img loading="lazy">는 그 요청을 늦추지 못해요.
 *
 * const { ref, isInView } = useInView();
 * <div ref={ref}>{isInView ? <PhotoGridCell ... /> : <div className="bg-line" />}</div>
 *
 * 주의할 점: IntersectionObserver가 없으면 처음부터 켜져 있어요(사진을 모두 그려요).
 * useReveal과 비슷하지만 그 훅은 움직임 줄이기 설정을 보고 떠오르는 효과를 켜는 일이라 따로 뒀어요.
 *
 * @returns {{ ref: import('react').RefObject<HTMLElement | null>, isInView: boolean }}
 */
export function useInView() {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(() => typeof IntersectionObserver !== 'function');

  useEffect(() => {
    const element = ref.current;
    if (isInView || !element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsInView(true);
        observer.disconnect();
      },
      { rootMargin: IN_VIEW_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isInView]);

  return { ref, isInView };
}
