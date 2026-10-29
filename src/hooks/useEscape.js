import { useEffect } from 'react';

const ESCAPE_KEY = 'Escape';

/**
 * Esc를 누르면 onEscape를 불러요. 컴포넌트가 사라지면 키 감시도 멈춰요.
 * 훅은 조건 안에서 부를 수 없어서, 닫혀 있을 때도 부르고 enabled로 감시만 꺼요.
 *
 * @param {() => void} onEscape
 * @param {boolean} [enabled] false면 키를 감시하지 않아요. 기본값은 true예요
 */
export function useEscape(onEscape, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === ESCAPE_KEY) onEscape();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
