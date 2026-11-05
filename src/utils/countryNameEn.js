const UNKNOWN_REGION_CODE = 'ZZ';
// 'Hong Kong SAR China'처럼 뒤에 붙는 설명은 떼요.
const SUFFIX = /\s*\(.*\)$|\s+SAR China$/;

const regionNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    : null;

/**
 * 나라 코드로 영어 나라 이름을 돌려줘요. 03 도시 블록의 "CANADA"처럼 대문자로 보일 글자예요.
 * 모르는 코드면 undefined예요. 한국어 이름은 getCountryName이 해요.
 *
 * @param {string | null | undefined} cc 두 글자 나라 코드. 소문자나 앞뒤 공백이 있어도 돼요
 * @returns {string | undefined} 예: 'CA' → 'Canada', 'HK' → 'Hong Kong'
 */
export function getEnglishCountryName(cc) {
  const code = typeof cc === 'string' ? cc.trim().toUpperCase() : '';
  if (!regionNames || !code || code === UNKNOWN_REGION_CODE) return undefined;

  try {
    return regionNames.of(code)?.replace(SUFFIX, '');
  } catch {
    // 글자 수나 모양이 코드가 아니면 Intl이 RangeError를 던져요.
    return undefined;
  }
}
