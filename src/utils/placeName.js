import {
  CITY_BY_REGION_CODE,
  CITY_KEYS,
  CITY_KEYS_BY_COUNTRY,
  COUNTRY_BY_REGION_CODE,
  UNKNOWN_CITY,
  UNKNOWN_PLACE,
} from '@/constants/geocode';
import { getCountryName } from '@/utils/countryName';

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const UNKNOWN_REGION_CODE = 'ZZ';
const REGION_CODE_KEY = /^ISO3166-2-lvl\d+$/;
const MIN_NAME_LENGTH = 2;

const KOREA_SUFFIX = /(특별자치시|특별시|광역시|시|군)$/;
const CITY_SUFFIX = /[시市]$/;
const CITY_SUFFIX_COUNTRIES = ['JP', 'TW', 'CN'];
const PROVINCE_SUFFIX = /주$/;
// 도쿄도(都)가 도시 자리에 오면 앱 표기인 도쿄로 바꿔요.
const TOKYO_METROPOLIS = '도쿄도';

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const cleanText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

// 떼고 남은 이름이 한 글자 이하면(시, 군 같은 이름) 떼지 않아요.
function stripSuffix(name, pattern) {
  const stripped = name.replace(pattern, '');
  return stripped.length >= MIN_NAME_LENGTH ? stripped : name;
}

/**
 * 서비스가 주는 도시 이름에서 행정 단위 글자를 떼서 앱 표기로 맞춰요.
 * 서울특별시 → 서울, 강릉시 → 강릉, 교토시 → 교토, 치앙마이주 → 치앙마이. 그 밖의 나라는 그대로예요.
 *
 * @param {unknown} name
 * @param {string} cc 나라 코드(대문자)
 * @returns {string}
 */
export function normalizeCityName(name, cc) {
  const text = cleanText(name);
  if (cc === 'KR') return stripSuffix(text, KOREA_SUFFIX);
  if (cc === 'JP' && text === TOKYO_METROPOLIS) return '도쿄';
  if (CITY_SUFFIX_COUNTRIES.includes(cc)) return stripSuffix(text, CITY_SUFFIX);
  if (cc === 'TH') return stripSuffix(text, PROVINCE_SUFFIX);
  return text;
}

// address의 ISO3166-2-lvl4 같은 칸에 든 행정 코드(JP-13, GB-WSM …)를 모두 모아요.
const readRegionCodes = (address) =>
  Object.entries(address)
    .filter(([key, value]) => REGION_CODE_KEY.test(key) && typeof value === 'string')
    .map(([, value]) => value);

function readCountryCode(address, regionCodes) {
  const regionCode = regionCodes.find((code) => Object.hasOwn(COUNTRY_BY_REGION_CODE, code));
  const raw = regionCode ? COUNTRY_BY_REGION_CODE[regionCode] : address.country_code;
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return COUNTRY_CODE_PATTERN.test(code) && code !== UNKNOWN_REGION_CODE ? code : '';
}

function readCityName(address, cc, regionCodes) {
  const regionCode = regionCodes.find((code) => Object.hasOwn(CITY_BY_REGION_CODE, code));
  if (regionCode) return CITY_BY_REGION_CODE[regionCode];

  for (const key of CITY_KEYS_BY_COUNTRY[cc] ?? CITY_KEYS) {
    const name = normalizeCityName(address[key], cc);
    if (name) return name;
  }
  return '';
}

/**
 * Nominatim 응답을 { city, country, cc }로 바꿔요.
 * 위치 응답이 아니면(오류 글, 깨진 모양) null이에요. 바다처럼 이름 붙은 곳이 없다는 응답은 null이 아니라
 * 이름 없는 곳이고, 나라 코드가 있으면 나라는 남겨요.
 *
 * @param {unknown} json
 * @returns {{ city: string, country: string, cc: string } | null}
 */
export function parsePlaceResponse(json) {
  if (!isPlainObject(json)) return null;
  // 이름 붙은 곳이 없으면 HTTP 200에 error 글을 줘요. 실패가 아니라 "이름 없음"이라는 답이에요.
  if (typeof json.error === 'string') return { ...UNKNOWN_PLACE };
  if (!isPlainObject(json.address)) return null;

  const { address } = json;
  const regionCodes = readRegionCodes(address);
  const cc = readCountryCode(address, regionCodes);

  return {
    city: readCityName(address, cc, regionCodes) || UNKNOWN_CITY,
    country: cc ? (getCountryName(cc) ?? cleanText(address.country)) : '',
    cc,
  };
}
