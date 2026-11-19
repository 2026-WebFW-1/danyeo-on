// 05 Passport 화면에서 쓰는 값이에요. 피그마 05 Passport(페이지 16:5, 프레임 38:2)에서 읽었어요.

// KM 칸 아래 "지구 N바퀴"의 한 바퀴(적도 둘레, km)예요.
export const EARTH_CIRCUMFERENCE_KM = 40075;

// 큰 제목 "TEN - STAMPS"의 숫자 단어예요. 이보다 많으면 숫자를 그대로 써요.
export const STAMP_COUNT_WORDS = [
  'ZERO',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
  'TWENTY',
];

// 집이 있는 나라를 모를 때 대신 쓰는 나라예요. 집이 있는 나라는 "입국"이 아니라서 스탬프를 찍지 않아요.
// 나라 코드는 Journey.home.cc에 있지만(#179), 그 전에 저장된 Journey에는 없고 이름 찾기가 실패하면 비어요.
// 그때는 서비스 대상(한국에 사는 사람)에 맞춰 한국으로 봐요.
export const DEFAULT_HOME_COUNTRY_CC = 'KR';

// 여권 한 쪽의 크기(px)예요. 스탬프 자리(stampSlots)가 이 크기 기준이라, 좁은 화면에서는 통째로 줄여요(useFitScale).
export const STAMP_PAGE_WIDTH = 1200;
export const STAMP_PAGE_HEIGHT = 640;

// 여권 한 쪽에 찍는 스탬프 수예요. 피그마 한 쪽이 5개씩 두 줄이에요. 넘치면 다음 쪽으로 넘겨요.
export const STAMPS_PER_PAGE = 10;

// 05 여행 캘린더가 보여 주는 기간이에요. 오늘이 든 달까지, 꽉 찬 달로 24개월이에요.
export const CALENDAR_MONTHS = 24;

// 캘린더 칸의 크기(px)예요. 피그마 "calendar grid"는 9px 칸을 2px 간격으로 두고, 왼쪽 40px에 요일을 적어요.
// CalendarGrid의 size-[9px] · gap-0.5 · left-10 클래스와 같은 값이라, 바꿀 때 같이 고쳐요.
export const CALENDAR_CELL_SIZE = 9;
export const CALENDAR_CELL_GAP = 2;
export const CALENDAR_LABEL_WIDTH = 40;
// 달 이름 · 칸 7줄 · 가장 긴 쉼 설명까지 합친 높이(px)예요. 좁은 화면에서 줄일 때 이 높이를 기준으로 해요.
export const CALENDAR_HEIGHT = 149;

// 칸의 줄 순서(월 → 일)대로 적은 요일이에요. 피그마처럼 월 · 수 · 금만 이름을 적고 나머지 줄은 비워요.
export const CALENDAR_WEEKDAYS = [
  { id: 'mon', label: '월' },
  { id: 'tue', label: '' },
  { id: 'wed', label: '수' },
  { id: 'thu', label: '' },
  { id: 'fri', label: '금' },
  { id: 'sat', label: '' },
  { id: 'sun', label: '' },
];

// 기록 MOST VISITED 아래에 이어 적는 도시 수예요. 이보다 많으면 한 곳 덜 적고 "외 N곳"으로 줄여서, 카드 폭(378px)에서 두 줄을 넘지 않게 해요.
export const RECORD_CITY_LIMIT = 5;
