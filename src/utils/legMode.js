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
