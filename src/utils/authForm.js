import { LOGIN_PATH, MIN_PASSWORD_LENGTH, SCREEN_NAMES } from '@/constants/auth';

// 골뱅이 앞뒤에 공백·골뱅이가 아닌 글자가 있고, 도메인에 점이 하나 이상 있으면 이메일로 봐요.
// 실제로 있는 주소인지는 서버가 판단해요. 여기선 오타(골뱅이 빠짐, 공백)만 먼저 막아요.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOME_PATH = '/';

// Supabase가 이메일·비밀번호가 틀렸을 때 주는 코드예요. 옛 버전은 code 없이 400만 줘요.
const INVALID_CREDENTIALS_CODE = 'invalid_credentials';
const BAD_REQUEST_STATUS = 400;

/**
 * 이메일 형식인지 봐요. 앞뒤 공백은 무시해요.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * 비밀번호가 최소 길이(8자) 이상인지 봐요.
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * 로그인한 뒤 돌아갈 주소를 걸러요. 이 앱 안의 주소만 그대로 돌려주고, 나머지는 홈('/')이에요.
 *  - 다른 사이트인지는 브라우저와 같은 규칙(URL)으로 판단해요. '//evil.com', '/\evil.com'뿐 아니라
 *    탭·줄바꿈을 끼운 '/\t/evil.com'도 브라우저는 그 글자를 지우고 다른 사이트로 읽어서, 글자 비교로는 못 막아요.
 *  - 로그인 화면 자신('/login', '/login?…')은 돌아가면 다시 로그인 화면이라 막아요.
 * @param {string | null | undefined} path 예: '/places?trip=p_356b49'
 * @returns {string}
 */
export function getSafeRedirect(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return HOME_PATH;

  const { origin } = window.location;
  const url = new URL(path, origin);
  if (url.origin !== origin) return HOME_PATH;
  if (url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`)) return HOME_PATH;

  return path;
}

/**
 * 12b 알림에 쓸 화면 이름을 찾아요. 모르는 주소면 null이에요.
 * @param {string} path 예: '/upload', '/chapter/밴쿠버-2025'
 * @returns {string | null} 예: '사진 올리기'
 */
export function getScreenName(path) {
  const pathname = path.split(/[?#]/)[0];
  const screen = SCREEN_NAMES.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  return screen?.name ?? null;
}

/**
 * 로그인 실패를 화면에 보여 줄 문장으로 바꿔요.
 * 서버의 원문은 영어 개발자용이라 보여 주지 않아요.
 * @param {{ code?: string, status?: number } | null | undefined} error Supabase AuthError
 * @returns {string}
 */
export function getSignInErrorMessage(error) {
  if (error?.code === INVALID_CREDENTIALS_CODE || error?.status === BAD_REQUEST_STATUS) {
    return '이메일 또는 비밀번호가 맞지 않아요';
  }
  return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요';
}
