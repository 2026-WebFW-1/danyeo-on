import { toLocalDate } from '../localDate';
import { group } from './group';

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

// 3. 시각 계산 함수 formAt, addYears

/**
 * 밀리초 시각을 그 시간대의 현지 시각 문자열로 바꿉니다. (toInstant를 거꾸로)
 * Date는 브라우저 시간대로 바뀌어서, 시간대만큼 더한 뒤 UTC로 읽고 시간대를 붙입니다.
 *
 * @param {number} ms ex: 1720684868000
 * @param {string} offset ex: '+09:00'
 * @returns {string} ex: '2024-07-11T17:01:21+09:00'
 */
function formAt(ms, offset) {
  const [, sign, hh, mm] = offset.match(/([+-])(\d{2}):(\d{2})/);
  const offsetMs = (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * MS_PER_MINUTE;

  // UTC 숫자에 시간대만큼 더해, UTC로 읽었을 때 현지 시각이 나옵니다.
  const localIso = new Date(ms + offsetMs).toISOString(); // '2024-07-11T17:01:08.000Z'
  const localTime = localIso.slice(0, LOCAL_TIME_LENGTH); // '2024-07-11T17:01:08'

  return `${localTime}${offset}`;
}

/**
 * 날짜에서 n년을 더하거나 뺍니다. 기간 필터 (1Y, 2Y)의 시작일을 만들 때 씁니다.
 *
 * @param {string} ex: '2026-08-16'
 * @param {number} n 빼려면 음수 ex: -1
 * @returns {string} ex: '2025-08-16'
 */
function addYears(date, n) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCFullYear(day.getUTCFullYear() + n);
  return toLocalDate(day.toISOString());
}

// 3. buildJourney 시작(뺀 사진을 거르고 묶기)
/**
 * 사진과 보정으로 화면이 받는 Journey를 만듭니다.
 * 순서: exclude 사진 빼기 -> group -> 지점 이름 및 경유
 *      -> 구간(집 포함) -> 여행 이름 및 이동 수단 보정
 *
 * @param {import('@/types').Photo[]} photos 올린 사진 전부. 순서는 상관없이
 * @param {import('@/types').Correction[]} corrections 만든 순서
 * @param {(lat: number, lng: number) => import('@/types').Place | Promise<import('@/types').Place>} findPlace 좌표의 도시 이름을 찾습니다. 앱에선 reverseCity를 그대로 넘기고, 테스트에선 fixture 값을 돌려줍니다.
 * @returns {Promise<import('@/types').Journey>}
 */
export async function buildJourney(photos, corrections, findPlace) {
  /** 보정 목록에서 한 종류만 꺼냅니다 */
  const byType = (type) => corrections.filter((correction) => correction.photoId);

  // 3. (사용자가)뺀 사진을 거르고 묶기
  // Set을 쓰는 이유는 사진이 많아지면 has가 include보다 빨라서이며 수백장이라 차이가 납니다.
  const excludeIds = new Set(byType('exclude').map((correction) => correction.photoId));
  const keptPhotos = photos.filter((photo) => !excludeIds.has(photo.id));
  const grouped = group(keptPhotos); // { home, stops, trips, unlocated }

  /**
   * group의 결과에는 사진 ID만 있습니다.
   * 사진의 시각, fileKey를 꺼내려면 ID로 사진을 찾아와야 하므로 미리표로 만들어둡니다.
   * photoById.get('p_356b49') // { id: 'p_356b49', takenAt: '2024-07-11T20:10:08', ... }
   */
  const photoById = new Map(keptPhotos.map((photo) => [photo.id, photo]));

  // trip.stopIds를 통해 이 지점은 어느 여행이 필요하여 뒤집은 표를 만듭니다.
  // trips: [{ id: 'p_356b49', stopIds: ['p_356b49', 'p_75d831'] }]
  // ex) tripIdByStopId.get('p_75d831') // 'p_356b49'
  const tripIdByStopId = new Map();
  grouped.trips.forEach((trip) => trip.stopIds.forEach((id) => tripIdByStopId.set(id, trip.id)));
}
