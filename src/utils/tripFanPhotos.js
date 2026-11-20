import {
  ARRIVAL_FAN_BOUNDS,
  ARRIVAL_FAN_JITTER_X,
  ARRIVAL_FAN_JITTER_Y,
  ARRIVAL_FAN_MAX_ROTATE,
  ARRIVAL_FAN_SLOTS,
  ARRIVAL_FAN_SPARE_SLOTS,
} from '@/constants/arrivalFan';
import { seededUnit, sortBySeed } from '@/utils/seededPick';
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
 * @returns {{ photos: FanPhoto[], total: number }} total은 여행의 사진 수예요(경유 지점 빼고).
 *   사진 목록을 아직 못 받았거나 실패해도 맞는 수가 나오게 지점의 photoCount로 세요
 */
export function selectTripFanPhotos(trip, stops, photos, limit) {
  if (!trip) return { photos: [], total: 0 };

  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const tripStops = trip.stopIds
    .map((id) => stopsById.get(id))
    .filter((stop) => stop && !stop.transit);
  const stopPhotos = tripStops.map((stop) => {
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

  return {
    photos: stopPhotos.flatMap((list, index) => list.slice(0, counts[index])),
    total: tripStops.reduce((sum, stop) => sum + stop.photoCount, 0),
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
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 시드로 -1 이상 1 미만의 수를 줘요.
 *
 * @param {number} seed
 * @param {string} key
 * @returns {number}
 */
function seededSigned(seed, key) {
  return seededUnit(seed, key) * 2 - 1;
}

/**
 * 사진 count장을 카드 왼쪽 위에 무작위로 흩뿌릴 자리예요(#187). 펼칠 때마다 새 시드를 줘서 매번 다르게 놓여요.
 *
 * - 카드에 가까운 기준 자리(ARRIVAL_FAN_SLOTS) count + 여분 곳을 시드로 섞어 count곳을 골라요.
 * - 고른 자리에서 x · y를 조금씩 어긋나게 하고, 기울기도 무작위로 줘요.
 * - 어긋나도 ARRIVAL_FAN_BOUNDS 안에 두어서 화면의 다른 부품을 가리지 않아요.
 * - 같은 시드면 몇 번을 다시 그려도 같은 자리예요. 재생이 멈춘 동안 다시 그려져도 사진이 움직이지 않아요.
 *
 * @param {number} count 자리 수(ARRIVAL_FAN_LIMIT)보다 많으면 자리 수만큼만 줘요
 * @param {number} seed createSeed로 만든 값
 * @returns {FanPose[]}
 */
export function scatterFanPoses(count, seed) {
  const { minX, maxX, minY, maxY } = ARRIVAL_FAN_BOUNDS;
  const nearSlots = ARRIVAL_FAN_SLOTS.slice(0, count + ARRIVAL_FAN_SPARE_SLOTS);
  return sortBySeed(nearSlots, seed, ({ x, y }) => `${x},${y}`)
    .slice(0, count)
    .map(({ x, y }, index) => ({
      x: Math.round(clamp(x + seededSigned(seed, `${index}:x`) * ARRIVAL_FAN_JITTER_X, minX, maxX)),
      y: Math.round(clamp(y + seededSigned(seed, `${index}:y`) * ARRIVAL_FAN_JITTER_Y, minY, maxY)),
      rotate: Math.round(seededSigned(seed, `${index}:rotate`) * ARRIVAL_FAN_MAX_ROTATE),
    }));
}
