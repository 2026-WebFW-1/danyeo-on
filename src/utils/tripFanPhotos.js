import { ARRIVAL_FAN_SLOTS } from '@/constants/arrivalFan';
import { findCoverIndex, selectStopPhotos } from '@/utils/selectStopPhotos';

/**
 * 01 도착 카드 더미에서 펼칠 사진 한 장이에요.
 *
 * @typedef {object} FanPhoto
 * @property {string} id
 * @property {string | null} fileKey 이미지가 없는 사진이면 null이에요(회색 칸으로 그려요)
 * @property {string} city 찍은 지점의 도시 이름
 */

/**
 * 한 여행의 사진을 펼칠 만큼만 골라요(#187). 01 도착 카드 더미에 마우스를 올리면 보여 줘요.
 *
 * - 경유 지점은 빼요. 지도에 점도 카드도 없는 곳이라서요.
 * - 지점마다 고르게 골라요. 사진이 많은 한 도시가 자리를 다 차지하지 않게, 지점을 돌아가며 한 장씩 뽑아요.
 * - 지점마다 대표 사진을 먼저 뽑아요. 카드에 보이던 사진이 펼친 사진에도 있어야 이어져 보여요.
 * - 고른 사진은 여행 순서(지점 순서)대로 놓아요. 펼치면 여행을 따라 도시가 바뀌어요.
 *
 * @param {import('@/types').Trip | null | undefined} trip
 * @param {import('@/types').Stop[]} stops 여행 기록의 지점 전부
 * @param {import('@/types').Photo[]} photos 로그인한 사람의 사진 전부(useMyPhotos)
 * @param {number} limit 최대 장수
 * @returns {{ photos: FanPhoto[], rest: number }} rest는 고르지 못하고 남은 장수
 */
export function selectTripFanPhotos(trip, stops, photos, limit) {
  if (!trip) return { photos: [], rest: 0 };

  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const stopPhotos = trip.stopIds
    .map((id) => stopsById.get(id))
    .filter((stop) => stop && !stop.transit)
    .map((stop) => {
      const refs = selectStopPhotos(stop, photos);
      const coverIndex = findCoverIndex(refs, stop.coverFileKey);
      const ordered = [refs[coverIndex], ...refs.filter((_, index) => index !== coverIndex)];
      return refs.length === 0 ? [] : ordered.map((ref) => ({ ...ref, city: stop.city }));
    });

  // 지점을 돌아가며 한 장씩 세어서, 지점마다 몇 장을 넣을지 정해요.
  const counts = stopPhotos.map(() => 0);
  let picked = 0;
  let hasMore = true;
  while (picked < limit && hasMore) {
    hasMore = false;
    for (let index = 0; index < stopPhotos.length && picked < limit; index += 1) {
      if (counts[index] < stopPhotos[index].length) {
        counts[index] += 1;
        picked += 1;
        hasMore = true;
      }
    }
  }

  const total = stopPhotos.reduce((sum, list) => sum + list.length, 0);
  return {
    photos: stopPhotos.flatMap((list, index) => list.slice(0, counts[index])),
    rest: total - picked,
  };
}

/**
 * 펼친 사진 한 장이 놓일 자리예요. 맨 앞 카드 가운데를 기준으로 한 px과 돌린 각도(도)예요.
 *
 * @typedef {object} FanPose
 * @property {number} x
 * @property {number} y
 * @property {number} rotate
 */

/**
 * 사진 count장을 카드 왼쪽 위에 흩뿌려 놓을 자리예요(#187). 카드에 가까운 자리(ARRIVAL_FAN_SLOTS)부터 써요.
 * 자리 수보다 많이 달라고 해도 자리 수만큼만 줘요. selectTripFanPhotos가 그 이상 고르지 않아요.
 *
 * @param {number} count
 * @returns {FanPose[]}
 */
export function calcFanPoses(count) {
  return ARRIVAL_FAN_SLOTS.slice(0, count);
}
