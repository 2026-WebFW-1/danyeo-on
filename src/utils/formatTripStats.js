/**
 * 한 여행의 요약 숫자를 StatRow가 받는 모양으로 바꿔요. 03 여행 머리의 숫자 넷이에요.
 * 큰 수는 천 단위 쉼표를 넣고, 브라우저 언어와 상관없이 같은 모양이에요.
 *
 * @param {import('@/types').TripStats} stats selectTripStats의 결과
 * @returns {{ value: string, label: string }[]}
 */
export function formatTripStats({ days, cities, km, photos }) {
  return [
    { value: `${days}일`, label: '기간' },
    { value: cities.toLocaleString('en-US'), label: '도시' },
    { value: `${km.toLocaleString('en-US')}km`, label: '이동' },
    { value: photos.toLocaleString('en-US'), label: '사진' },
  ];
}
