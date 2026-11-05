// 집을 가리키는 값이에요. 구간(leg)의 from·to에 지점 ID 대신 들어가요.
export const HOME_ID = 'home';

// 01 지도 재생의 기간 탭이에요. Journey.periods의 키와 같은 이름이에요.
// 01 화면의 탭과 ?period= 검사에 같이 써요.
export const PERIODS = ['1y', '2y', 'all'];
// 피그마 01이 2Y를 고른 상태예요.
export const DEFAULT_PERIOD = '2y';
// 01 화면이 기간을 URL에 남기는 칸 이름이에요. 예: /map?period=1y
export const PERIOD_PARAM = 'period';

// 비행은 지도에서 비행기 아이콘을 써서 이모지가 없어요.
export const MODE_EMOJI = { train: '🚆', car: '🚗' };
// 구간 데이터는 버스를 구분하지 못해서 버스도 '차'로 보여요.
export const MODE_LABEL = { flight: '비행', train: '기차', car: '차' };
