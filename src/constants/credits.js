export const CREDITS_PATH = '/credits';

// OSM이 표기와 함께 걸어 달라고 하는 저작권 안내 주소예요.
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const NATURAL_EARTH_URL = 'https://www.naturalearthdata.com/';
export const WORLD_ATLAS_URL = 'https://github.com/topojson/world-atlas';

// 추가 확보한 데모 사진의 출처 파일이에요. demo-assets 버킷의 <uuid>/<인물>/ 아래에 있어요(src/data/README.md).
export const COVERAGE_CREDITS_FILE = 'coverage-credits.json';
// 처음부터 있던 데모 사진(public/photos)의 출처 파일이에요. 앱과 같이 배포돼요.
export const LOCAL_CREDITS_URL = '/photos/credits.json';

// 출처 파일에 라이선스 주소가 없는 사진(public/photos/credits.json)에 붙여요. CC 라이선스는 주소도 같이 보여 줘야 해요.
export const LICENSE_URLS = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 2.5': 'https://creativecommons.org/licenses/by/2.5/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  // 공공누리 제1유형(출처 표시)이에요.
  'KOGL Type 1': 'https://www.kogl.or.kr/info/licenseType1.do',
};
