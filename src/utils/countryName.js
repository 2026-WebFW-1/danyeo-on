import { COUNTRY_NAME_OVERRIDES } from '@/constants/geocode';

const UNKNOWN_REGION_CODE = 'ZZ';
const PARENTHESES_SUFFIX = /\s*\(.*\)$/;

const regionNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['ko'], { type: 'region', fallback: 'none' })
    : null;

/**
 * 나라 코드로 앱에서 쓰는 한국어 나라 이름을 돌려줘요. 모르는 코드면 undefined예요.
 * 브라우저의 한국어 이름에서 괄호 설명을 빼고 쓰고(홍콩(중국 특별행정구) → 홍콩),
 * 앱 표기와 다른 나라만 constants의 표로 바꿔요(KR → 한국).
 *
 * @param {string} cc 두 글자 나라 코드. 소문자나 앞뒤 공백이 있어도 돼요
 * @returns {string | undefined}
 */
export function getCountryName(cc) {
  const code = typeof cc === 'string' ? cc.trim().toUpperCase() : '';
  if (Object.hasOwn(COUNTRY_NAME_OVERRIDES, code)) return COUNTRY_NAME_OVERRIDES[code];
  if (!regionNames || code === UNKNOWN_REGION_CODE) return undefined;

  try {
    return regionNames.of(code)?.replace(PARENTHESES_SUFFIX, '');
  } catch {
    // 글자 수나 모양이 코드가 아니면 Intl이 RangeError를 던져요.
    return undefined;
  }
}
