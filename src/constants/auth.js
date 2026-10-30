// 로그인 화면 주소. 보호 화면에서 쫓겨나면 ?redirect=에 보던 주소를 붙여 여기로 와요.
export const LOGIN_PATH = '/login';
export const REDIRECT_PARAM = 'redirect';

// 세션 확인이 이보다 오래 걸리면(Supabase 응답 없음) 로딩에 멈추지 않고 로그인 화면을 보여 줘요.
export const SESSION_CHECK_TIMEOUT_MS = 8000;

// 데모 계정은 danyeo-on-be의 seed.sql이 만들어요. 비밀번호는 BE README에 이미 공개된 값이에요.
export const DEMO_PASSWORD = 'demo1234';

// 기본 시연은 윤서진이라 맨 앞에 둬요.
export const DEMO_ACCOUNTS = [
  { email: 'seojin@demo.local', label: '윤서진으로 보기' },
  { email: 'edge@demo.local', label: '경계 케이스 계정' },
  { email: 'empty@demo.local', label: '빈 계정' },
];

// 12b 알림의 "보던 화면(…)" 이름. 주소가 이 경로이거나 그 아래면 그 이름을 써요.
export const SCREEN_NAMES = [
  { path: '/upload', name: '사진 올리기' },
  { path: '/map', name: '지도' },
  { path: '/places', name: '전체 기록' },
  { path: '/chapter', name: '챕터' },
  { path: '/edit/photos', name: '사진 정리' },
];
