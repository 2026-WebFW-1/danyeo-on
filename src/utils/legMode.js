import { HOME_ID } from '@/constants/journey';
import { hasNoLandRoute } from '@/utils/landRoute';

// 사진에는 위치와 시각만 있고 무엇을 타고 갔는지는 없어서, 구간의 거리 · 양 끝 · 사진 사이 시간으로 이동 수단을 정해요.
// 이 거리보다 길면 비행기예요. 딱 700km는 기차예요.
const FLIGHT_OVER_KM = 700;
// 이 거리 이상이면 기차예요. 딱 150km도 기차예요.
const TRAIN_FROM_KM = 150;
// 사진 사이 시간으로 잰 속도가 이보다 빠르면 비행기예요. 딱 150km/h는 아니에요.
const FLIGHT_OVER_KMH = 150;

// 이동 수단마다 속도와 더 드는 시간이에요. 집 <> 첫, 마지막 지점의 이동 시간과 05 Passport의 비행 시간을 추정할 때 써요.
// 집 사진 시각을 쓰면 서울 -> 방콕이 100시간이 되어버리니 거리 ÷ 속도로 추정해요.
// 수단이 늘면 여기에 한 줄만 더하면 돼요.
const TRAVEL_MODES = {
  flight: { kmh: 800, extraHours: 0.5 }, // 타고 내리는 시간
  train: { kmh: 120, extraHours: 0 },
  car: { kmh: 70, extraHours: 0 },
};

/**
 * 구간의 이동 수단을 정해요(기능 명세 §7). buildJourney가 구간의 mode를 채울 때 써요(modeSource: 'auto').
 * 사용자가 고친 이동 수단(modeSource: 'user')은 여기서 다루지 않아요.
 * 위에서부터 먼저 맞는 규칙을 써요.
 *  1. 700km 초과 → 비행
 *  2. 육로로 갈 수 없음(hasNoLandRoute) → 비행. 예: 서울 → 후쿠오카 545km, 서울 → 제주
 *  3. 거리 ÷ 사진 사이 시간이 150km/h 초과 → 비행
 *  4. 150km 이상 → 기차
 *  5. 나머지 → 차
 *
 * route를 넘기지 않으면 거리만 봐요(1 · 4 · 5번). 나라 이름을 찾기 전인 group이 그렇게 써요.
 * route에서 모르는 칸은 비워 두면 그 규칙만 건너뛰어요.
 *
 * @param {number} km 구간 거리. buildJourney가 계산한 0 이상의 숫자라 따로 검사하지 않아요
 * @param {object} [route]
 * @param {{ cc?: string, lat?: number, lng?: number }} [route.from] 출발한 곳
 * @param {{ cc?: string, lat?: number, lng?: number }} [route.to] 도착한 곳
 * @param {number} [route.maxHours] 출발한 곳의 마지막 사진과 도착한 곳의 첫 사진 사이 시간.
 *   실제 이동보다 길 수 있어요. 집 쪽은 사진으로 시각을 알 수 없어서 넘기지 않아요
 * @returns {import('@/types').Leg['mode']}
 */
export function legMode(km, { from, to, maxHours } = {}) {
  if (km > FLIGHT_OVER_KM) return 'flight';
  if (from && to && hasNoLandRoute(from, to)) return 'flight';
  // 시간대를 모르는 사진 때문에 시간이 0 이하로 나오면 속도를 잴 수 없어요.
  if (maxHours > 0 && km / maxHours > FLIGHT_OVER_KMH) return 'flight';
  if (km >= TRAIN_FROM_KM) return 'train';
  return 'car';
}

/**
 * 거리와 이동 수단으로 걸린 시간을 추정해요.
 * 집에서 나간 시각과 돌아온 시각은 사진으로 알 수 없어서 buildJourney가 이 값으로 채워요.
 *
 * @param {number} km 구간 거리
 * @param {import('@/types').Leg['mode']} mode
 * @returns {number} 시간. 예: 3717km 비행 → 5.15
 */
export function calcTravelHours(km, mode) {
  return km / TRAVEL_MODES[mode].kmh + TRAVEL_MODES[mode].extraHours;
}

/**
 * 사용자가 이 구간의 이동 수단을 고칠 수 있는지예요.
 * 보정은 출발 지점의 사진(fromPhotoId)으로 구간을 찾아요. 지점에서 출발하면 지점 ID가 그 지점의 첫 사진이라 늘 고칠 수 있어요.
 * 집은 Journey에서 지점(Stop)이 아니라 구간의 from이 'home'뿐이라, buildJourney가 실어 준 사진 ID(leg.fromPhotoId)가 있어야 해요.
 * 집을 직접 지정한 계정이 여행 사이에 끼운 집(사진이 없어요)에서 나가는 구간에는 그 값이 없어서 고칠 수 없어요(#269).
 * 3판(#249) 전에 저장된 Journey에는 그 값이 없어요. 읽을 때 뒤에서 다시 계산하니(journeyService) 그동안만 못 고쳐요.
 *
 * @param {import('@/types').Leg} leg
 * @returns {boolean}
 */
export function canEditLegMode(leg) {
  return leg.from !== HOME_ID || Boolean(leg.fromPhotoId);
}

/**
 * 구간의 이동 수단을 고치는 보정이에요. useCorrections의 add에 넘겨요.
 * 지점 ID가 그 지점의 첫 사진 ID라서 그대로 fromPhotoId로 써요. 집에서 나가는 구간은 집을 떠난 사진(leg.fromPhotoId)을 써요.
 * buildJourney는 출발 지점의 사진 중 하나면 그 구간으로 찾아요.
 *
 * @param {import('@/types').Leg} leg canEditLegMode가 true인 구간
 * @param {import('@/types').Leg['mode']} mode
 * @returns {import('@/types').CorrectionInput}
 */
export function toModeCorrection(leg, mode) {
  return { type: 'mode', fromPhotoId: leg.from === HOME_ID ? leg.fromPhotoId : leg.from, mode };
}
