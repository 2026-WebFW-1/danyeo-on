import { UNKNOWN_PLACE } from '@/constants/geocode';

/**
 * 네트워크 없이 쓰는 가짜 reverseCity예요. *.group.json의 지점 좌표로 그 지점의 place를 찾아 돌려주고,
 * 모르는 좌표는 이름 없는 곳을 돌려줘요. 집 좌표도 지점 중 하나와 같아서 찾아요.
 * 불린 좌표는 fake.calls에 쌓여요.
 *
 * 쓰는 곳: buildJourney 테스트에서 deps.reverseCity 자리에 넣어요.
 * const reverseCity = createFakeReverseCity(seojinGroup);
 *
 * @param {{ stops: { lat: number, lng: number, place: import('@/types').Place }[] }} group
 */
export function createFakeReverseCity(group) {
  const places = new Map(group.stops.map((stop) => [`${stop.lat},${stop.lng}`, stop.place]));
  const calls = [];

  async function fakeReverseCity(lat, lng) {
    calls.push({ lat, lng });
    return { ...(places.get(`${lat},${lng}`) ?? UNKNOWN_PLACE) };
  }

  fakeReverseCity.calls = calls;
  return fakeReverseCity;
}
