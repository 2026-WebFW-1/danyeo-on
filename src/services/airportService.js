/** @type {Promise<{ lat: number, lng: number }[]> | null} */
let request = null;

/**
 * 대형 · 중형 공항의 좌표예요. 07 사진 정리가 경유 후보를 찾을 때 써요(utils/transitCandidates).
 *
 * 파일(76KB)은 처음 부를 때 따로 받아요. 07에서만 써서 첫 화면 묶음에 넣지 않았어요.
 * 한 번 받으면 모두 같은 배열을 받고, 실패하면 기억을 지워서 다음에 다시 받아요.
 * 목록은 scripts/buildAirports.mjs가 OurAirports(퍼블릭 도메인)에서 만들어요.
 *
 * @returns {Promise<{ lat: number, lng: number }[]>}
 */
export function getAirports() {
  if (!request) {
    const current = import('@/data/airports.json').then(({ default: flat }) => {
      // 파일은 [위도, 경도, 위도, 경도, …]로 이어 적혀 있어요.
      const airports = [];
      for (let i = 0; i < flat.length; i += 2) airports.push({ lat: flat[i], lng: flat[i + 1] });
      return airports;
    });
    current.catch(() => {
      if (request === current) request = null;
    });
    request = current;
  }
  return request;
}
