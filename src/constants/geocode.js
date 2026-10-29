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
