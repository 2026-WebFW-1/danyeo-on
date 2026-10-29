export const UNKNOWN_CITY = '이름 없는 곳';
export const UNKNOWN_PLACE = Object.freeze({ city: UNKNOWN_CITY, country: '', cc: '' });

// 브라우저가 주는 한국어 나라 이름과 앱 표기가 다른 나라예요. 나머지는 브라우저 이름을 그대로 써요.
export const COUNTRY_NAME_OVERRIDES = { KR: '한국', AU: '호주' };

// 응답의 address에서 도시 이름을 읽는 칸이에요. 앞에 있는 칸이 먼저예요.
export const CITY_KEYS = ['city', 'town', 'village', 'hamlet', 'municipality'];
// 한국은 시가 없는 곳의 군, 태국은 읍·면 이름 대신 도 이름(치앙마이주)을 도시 이름으로 써요.
export const CITY_KEYS_BY_COUNTRY = { KR: ['city', 'county'], TH: ['city', 'province'] };

const LONDON_REGION_CODES = [
  ...['LND', 'BKG', 'BNE', 'BEX', 'BEN', 'BRY', 'CMD', 'CRY', 'EAL', 'ENF', 'GRE', 'HCK'],
  ...['HMF', 'HRY', 'HRW', 'HAV', 'HIL', 'HNS', 'ISL', 'KEC', 'KTT', 'LBH', 'LEW', 'MRT'],
  ...['NWM', 'RDB', 'RIC', 'SWK', 'STN', 'TWH', 'WFT', 'WND', 'WSM'],
];

// 구마다 따로 이름이 오는 큰 도시예요. 응답의 행정 코드(ISO 3166-2)가 이 표에 있으면 그 도시로 묶어요.
export const CITY_BY_REGION_CODE = {
  'JP-13': '도쿄',
  ...Object.fromEntries(LONDON_REGION_CODES.map((code) => [`GB-${code}`, '런던'])),
};

// 홍콩·마카오는 나라 코드가 CN으로 와서 행정 코드로 따로 알아봐요.
export const COUNTRY_BY_REGION_CODE = { 'CN-HK': 'HK', 'CN-MO': 'MO' };

// OpenStreetMap의 공개 Nominatim 서버예요. 키 없이 브라우저에서 바로 부를 수 있어요.
export const GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';
// zoom 10은 도시 단위예요. 한국어 이름이 없는 곳은 영어 이름이 와요.
export const GEOCODE_QUERY = Object.freeze({
  format: 'jsonv2',
  zoom: '10',
  addressdetails: '1',
  'accept-language': 'ko,en',
});

// 서비스로 보내는 좌표의 소수 자릿수예요. 3자리는 약 100m라서 도시 이름은 그대로고, 집 같은 정확한 위치는 밖으로 나가지 않아요.
export const COORDINATE_DIGITS = 3;

// 이 거리 안의 좌표는 같은 곳으로 보고 이전 결과를 다시 써요.
export const CACHE_RADIUS_KM = 1;
export const REQUEST_TIMEOUT_MS = 8000;
// 공개 서버는 1초에 한 번까지만 받아서, 요청을 시작하는 시각 사이를 1초보다 조금 더 띄워요.
export const REQUEST_INTERVAL_MS = 1100;
// 연달아 이만큼 실패하면 COOLDOWN_MS 동안은 요청하지 않아요. 서비스가 막았을 때 계속 두드리지 않게 해요.
export const FAILURE_LIMIT = 3;
export const COOLDOWN_MS = 30_000;
