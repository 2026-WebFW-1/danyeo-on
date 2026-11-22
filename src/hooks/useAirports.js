import { useEffect, useState } from 'react';

import { getAirports } from '@/services/airportService';

// 아직 못 받았을 때 줄 빈 목록이에요. 같은 배열을 써야 렌더링마다 다른 값으로 보이지 않아요.
const NO_AIRPORTS = [];

/**
 * 공항 좌표를 받아 주는 훅이에요. 07 사진 정리가 경유 후보를 찾을 때 써요.
 *
 * const airports = useAirports();
 *
 * 받는 동안과 실패했을 때는 빈 배열이에요. 경유 후보는 안내일 뿐이라, 못 받으면 안내 없이 화면을 그대로 써요.
 *
 * @returns {{ lat: number, lng: number }[]}
 */
export function useAirports() {
  const [airports, setAirports] = useState(NO_AIRPORTS);

  useEffect(() => {
    let isCurrent = true;
    getAirports().then(
      (loaded) => isCurrent && setAirports(loaded),
      (error) => console.error(error),
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  return airports;
}
