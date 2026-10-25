/**
 * 도시를 세거나 구분할 때 쓰는 키예요. 이름이 같아도 나라가 다르면(미국 포틀랜드, 호주 포틀랜드) 다른 도시라서 나라 코드를 같이 묶어요.
 *
 * @param {Pick<import('@/types').Stop, 'cc' | 'city'>} stop
 * @returns {string} 예: 'CA/밴쿠버'
 */
export function getCityKey(stop) {
  return `${stop.cc}/${stop.city}`;
}
