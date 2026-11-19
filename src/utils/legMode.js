import { HOME_ID } from '@/constants/journey';

// 사진에는 위치와 시각만 있고 무엇을 타고 갔는지는 없어서, 구간 거리로 이동 수단을 정해요.
// 이 거리보다 길면 비행기예요. 딱 700km는 기차예요.
const FLIGHT_OVER_KM = 700;
// 이 거리 이상이면 기차예요. 딱 150km도 기차예요.
const TRAIN_FROM_KM = 150;

/**
 * 구간 거리로 이동 수단을 정해요. buildJourney가 구간의 mode를 채울 때 써요(modeSource: 'auto').
 * 사용자가 고친 이동 수단(modeSource: 'user')은 여기서 다루지 않아요.
 *
 * @param {number} km 구간 거리. buildJourney가 계산한 0 이상의 숫자라 따로 검사하지 않아요
 * @returns {import('@/types').Leg['mode']} 700km 초과 'flight', 150km 이상 'train', 나머지 'car'
 */
export function legMode(km) {
  if (km > FLIGHT_OVER_KM) return 'flight';
  if (km >= TRAIN_FROM_KM) return 'train';
  return 'car';
}

/**
 * 사용자가 이 구간의 이동 수단을 고칠 수 있는지예요.
 * 보정은 출발 지점의 사진(fromPhotoId)으로 구간을 찾는데, 집에는 사진이 없어서
 * buildJourney가 집에서 나가는 구간의 보정을 받지 않아요.
 *
 * @param {import('@/types').Leg} leg
 * @returns {boolean}
 */
export function canEditLegMode(leg) {
  return leg.from !== HOME_ID;
}

/**
 * 구간의 이동 수단을 고치는 보정이에요. useCorrections의 add에 넘겨요.
 * 지점 ID가 그 지점의 첫 사진 ID라서 그대로 fromPhotoId로 써요.
 * buildJourney는 출발 지점의 사진 중 하나면 그 구간으로 찾아요.
 *
 * @param {import('@/types').Leg} leg canEditLegMode가 true인 구간
 * @param {import('@/types').Leg['mode']} mode
 * @returns {import('@/types').CorrectionInput}
 */
export function toModeCorrection(leg, mode) {
  return { type: 'mode', fromPhotoId: leg.from, mode };
}
