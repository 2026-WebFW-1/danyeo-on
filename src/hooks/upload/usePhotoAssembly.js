import { useEffect, useState, useSyncExternalStore } from 'react';

const ARRIVAL_INTERVAL_MS = 60;

function subscribeMotion(callback) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 준비된 사진을 한 장씩 시간 차를 두고 보여 주려고, 지금까지 보여 줄 장 수를 셉니다.(#87)
 *
 * 호출: PilePhotosStep
 * const count = usePhotoAssembly(photos.length);
 *
 * 의도: 썸네일은 한꺼번에 준비될 때도 있어서, 그대로 그리면 더미가 한 번에 생겨 쌓이는 느낌이 없습니다.
 * 60ms마다 한 장씩 늘리되, 밀린 사진이 많으면 한 번에 여러 장(남은 수의 1%)씩 따라잡습니다.
 * 움직임 줄이기를 켠 사용자에게는 기다리지 않고 바로 다 보여 줍니다.
 * @param {number} limit 지금까지 준비된 사진 수
 * @returns {number} 지금 보여 줄 사진 수
 */
export function usePhotoAssembly(limit) {
  const [count, setCount] = useState(0);
  const isReducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion);

  useEffect(() => {
    if (isReducedMotion || count >= limit) return;
    const timer = setTimeout(() => {
      setCount((current) =>
        Math.min(limit, current + Math.max(1, Math.ceil((limit - current) / 100))),
      );
    }, ARRIVAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [limit, count, isReducedMotion]);

  return isReducedMotion ? limit : Math.min(count, limit);
}
