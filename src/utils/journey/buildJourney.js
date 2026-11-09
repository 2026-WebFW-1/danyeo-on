// 1. 상수
const DEFAULT_OFFSET = '+09:00';

// 집 <> 첫, 마지막 지점은 집 사진 시각을 스면 서울 -> 방콕이 100시간이 되어버리니
// 거리 % 속도로 추정합니다.
const SPEED_KMH = { flight: 800, train: 120, car: 70 };
const FLIGHT_EXTRA_HOURS = 0.5; // 타고 내리는 시간
const MS_PER_MINUTE = 60 * 1000; // 1분
const MS_PER_HOUR = 60 * MS_PER_MINUTE; // 1시간
const LOCAL_TIME_LENGTH = 'YYYY-MM-DDTHH:mm:ss'.length;
/** 지구 반 바퀴를 경도 및 각도로 나타낸 값 */
const HALF_TURN_DEG = 180;
/** 여행 이름을 자동으로 만들 때 도시 이름 사이에 사용합니다. */
const TRIP_NAME_SEPARATOR = ' · ';
const HOME = 'home';

// 2. 작은 도우미
/**
 * 사진의 현지 시각 뒤에 시간대를 붙여요. Journey의 from·to·departAt·arriveAt이 이 모양이에요.
 * 시간대가 없는 사진은 group과 똑같이 +09:00으로 봐요.
 *
 * @param {import('@/types').Photo} photo
 * @returns {string} 예: '2024-07-11T20:10:08+07:00'
 */
const withOffset = (photo) => `${photo.takenAt}${photo.offset ?? DEFAULT_OFFSET}`;

/**
 * 사진을 찍은 순간을 밀리초로 바꿔요.
 * 시간대가 다른 두 사진은 문자열로 빼거나 비교할 수 없어서, 숫자로 바꿔 계산해요.
 *
 * @param {import('@/types').Photo} photo
 * @returns {number} 예: 1720703408000
 */
const toInstant = (photo) => Date.parse(withOffset(photo));

/**
 * 시간을 소수 첫째 자리까지 반올림해요. Leg.hours가 이 자릿수예요.
 *
 * @param {number} hours
 * @returns {number} 예: 5.1347 → 5.1
 */
const roundHours = (hours) => Math.round(hours * 10) / 10;

/**
 * 거리와 이동 수단으로 걸린 시간을 추정해요. 비행기는 타고 내리는 30분을 더해요.
 * 집에서 나간 시각과 돌아온 시각은 사진으로 알 수 없어서 이 값으로 채워요.
 *
 * @param {number} km 구간 거리
 * @param {import('@/types').Leg['mode']} mode
 * @returns {number} 시간. 예: 3717km 비행 → 5.15
 */
const calcTravelHours = (km, mode) =>
  km / SPEED_KMH[mode] + (mode === 'flight' ? FLIGHT_EXTRA_HOURS : 0);
