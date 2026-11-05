/**
 * 03 전체 기록 머리의 한 줄 요약을 만들어요. 첫 여행을 시작한 달부터 방문한 곳과 여행 수를 세어 줘요.
 * "곳"은 지점 수예요. 같은 도시에 두 번 가면 두 곳이에요(경유 지점은 빠져요).
 * 여행이 없으면 null이라서, 그때는 이 줄을 그리지 않아요.
 *
 * @param {import('@/types').JourneyTotals} totals selectJourneyTotals의 결과
 * @returns {string | null} 예: '2024년 10월부터 13곳, 6번의 여행. 여행 하나를 골라 따라가 보세요.'
 */
export function formatJourneyIntro({ firstTripStart, stops, trips }) {
  if (!firstTripStart) return null;

  const { year, month } = firstTripStart;
  return `${year}년 ${month}월부터 ${stops}곳, ${trips}번의 여행. 여행 하나를 골라 따라가 보세요.`;
}
