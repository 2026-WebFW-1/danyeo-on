import { describe, expect, test } from 'vitest';

import { DEMO_ACCOUNTS } from '@/constants/auth';
import {
  getSafeRedirect,
  getScreenName,
  getSignInErrorMessage,
  isValidEmail,
} from '@/utils/authForm';

describe('isValidEmail', () => {
  test.each(['seojin@demo.local', 'a.b+c@example.co.kr', '  seojin@demo.local  '])(
    '%j는 이메일이에요',
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  test.each(['', 'seojin', 'seojin@', '@demo.local', 'seojin@demo', 'se jin@demo.local', 'a@@b.c'])(
    '%j는 이메일이 아니에요',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );

  test('데모 계정은 모두 이메일 형식이에요', () => {
    expect(DEMO_ACCOUNTS.every((account) => isValidEmail(account.email))).toBe(true);
  });
});

describe('getSafeRedirect', () => {
  test.each(['/', '/upload', '/places?trip=p_356b49', '/chapter/밴쿠버-2025#top', '/loginx'])(
    '앱 안의 주소 %j는 그대로예요',
    (path) => {
      expect(getSafeRedirect(path)).toBe(path);
    },
  );

  test.each([
    ['다른 사이트(//)', '//evil.com'],
    ['다른 사이트(/\\)', '/\\evil.com'],
    ['탭을 끼운 다른 사이트', '/\t/evil.com'],
    ['줄바꿈을 끼운 다른 사이트', '/\n/evil.com'],
    ['캐리지 리턴을 끼운 다른 사이트', '/\r/evil.com'],
    ['전체 주소', 'https://evil.com/upload'],
    ['/로 시작하지 않는 주소', 'upload'],
    ['로그인 화면', '/login'],
    ['로그인 화면 + 쿼리', '/login?redirect=%2Fupload'],
    ['로그인 화면 아래', '/login/again'],
    ['빈 문자열', ''],
    ['null', null],
    ['undefined', undefined],
  ])('%s는 홈으로 보내요', (_name, path) => {
    expect(getSafeRedirect(path)).toBe('/');
  });
});

describe('getScreenName', () => {
  test.each([
    ['/upload', '사진 올리기'],
    ['/upload?step=2', '사진 올리기'],
    ['/map', '지도'],
    ['/places?trip=p_356b49', '전체 기록'],
    ['/chapter/밴쿠버-2025', '챕터'],
    ['/edit/photos?tab=excluded', '사진 정리'],
  ])('%j는 %s예요', (path, name) => {
    expect(getScreenName(path)).toBe(name);
  });

  test.each(['/', '/uploads', '/passport'])('모르는 주소 %j는 null이에요', (path) => {
    expect(getScreenName(path)).toBeNull();
  });
});

describe('getSignInErrorMessage', () => {
  test('이메일·비밀번호가 틀리면(invalid_credentials) 그렇게 알려요', () => {
    expect(getSignInErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe(
      '이메일 또는 비밀번호가 맞지 않아요',
    );
  });

  test('code가 없는 400도 같은 문장이에요', () => {
    expect(getSignInErrorMessage({ status: 400 })).toBe('이메일 또는 비밀번호가 맞지 않아요');
  });

  test('비밀번호는 맞았는데 메일 인증 전(email_not_confirmed, 400)이면 그렇게 알려요', () => {
    expect(getSignInErrorMessage({ code: 'email_not_confirmed', status: 400 })).toBe(
      '이메일 인증이 아직 안 된 계정이에요',
    );
  });

  test.each([
    ['요청이 너무 많음', { code: 'over_request_rate_limit', status: 429 }],
    ['401', { status: 401 }],
    ['403', { status: 403 }],
    ['404', { status: 404 }],
    ['422', { status: 422 }],
  ])('%s처럼 400이 아닌 4xx는 연결 문제가 아니라 로그인 실패로 안내해요', (_name, error) => {
    expect(getSignInErrorMessage(error)).toBe('로그인하지 못했어요. 잠시 후 다시 시도해 주세요');
  });

  test.each([
    ['네트워크 실패(status 0)', { status: 0 }],
    ['서버 오류', { status: 500 }],
    ['모양을 모르는 오류', new Error('boom')],
    ['없음', undefined],
  ])('%s면 연결 문제로 안내해요', (_name, error) => {
    expect(getSignInErrorMessage(error)).toBe(
      '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요',
    );
  });
});
