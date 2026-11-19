// 집을 가리키는 값이에요. 구간(leg)의 from·to에 지점 ID 대신 들어가요.
export const HOME_ID = 'home';

// 01 지도 재생의 기간 탭이에요. Journey.periods의 키와 같은 이름이에요.
// 01 화면의 탭과 ?period= 검사에 같이 써요.
export const PERIODS = ['1y', '2y', 'all'];
// 피그마 01이 2Y를 고른 상태예요.
export const DEFAULT_PERIOD = '2y';
// 01 화면이 기간을 URL에 남기는 칸 이름이에요. 예: /map?period=1y
export const PERIOD_PARAM = 'period';
// 01 화면에서 한 여행만 재생할 때 여행 ID를 남기는 칸 이름이에요. 예: /map?trip=p_356b49
export const TRIP_PARAM = 'trip';

// 구간의 이동 수단이에요. 01 지도의 이동 수단 메뉴가 이 순서로 보여요.
export const LEG_MODES = ['flight', 'train', 'car'];
// 비행은 지도에서 비행기 아이콘으로 보여요. 비행 이모지는 이동 수단 메뉴와, 비행으로 고친 구간의 라벨에만 써요.
export const MODE_EMOJI = { flight: '✈️', train: '🚆', car: '🚗' };
// 구간 데이터는 버스를 구분하지 못해서 버스도 '차'로 보여요.
export const MODE_LABEL = { flight: '비행', train: '기차', car: '차' };
