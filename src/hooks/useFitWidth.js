import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 한 줄로 그린 내용이 감싸는 칸보다 넓으면, 칸 폭에 맞게 줄일 배율과 줄인 높이를 줘요. 배율은 1을 넘지 않아요.
 * useFitScale은 기준 폭이 정해진 것(02 콜라주, 05 여권 쪽)에 쓰고, 이 훅은 글자 수에 따라 폭이 바뀌는 것(05 큰 제목)에 써요.
 *
 * const { containerRef, contentRef, scale, height } = useFitWidth();
 * <div ref={containerRef} style={{ height }}>
 *   <p ref={contentRef} style={{ transform: `scale(${scale})` }}>…</p>
 * </div>
 *
 * 내용의 폭은 offsetWidth로 재요. offsetWidth는 transform을 빼고 잰 원래 폭이라, 줄인 뒤에 다시 재도 같은 값이에요.
 * transform은 자리를 차지하는 크기를 바꾸지 않아서, 감싸는 칸의 높이는 줄인 높이(height)로 따로 정해요.
 * 감싸는 칸이 flex면 내용이 칸 높이로 늘어나지 않게 items-start를 줘요. 늘어나면 줄인 높이를 다시 재서 계속 작아져요.
 * 칸 폭이 바뀌거나(창 크기) 내용 폭이 바뀌면(글꼴을 늦게 받음, 글자가 바뀜) 다시 재요(ResizeObserver).
 *
 * @returns {{
 *   containerRef: import('react').RefObject<HTMLElement | null>,
 *   contentRef: import('react').RefObject<HTMLElement | null>,
 *   scale: number,
 *   height: number | undefined,
 * }} height: 아직 재지 않았으면 undefined라서 칸이 원래 높이로 그려져요
 */
export function useFitWidth() {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: undefined });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return undefined;

    const measure = () => {
      const scale = Math.min(1, container.clientWidth / content.offsetWidth);
      const height = content.offsetHeight * scale;
      setFit((prev) => (prev.scale === scale && prev.height === height ? prev : { scale, height }));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { containerRef, contentRef, ...fit };
}
