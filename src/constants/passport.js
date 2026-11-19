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

// 입국 스탬프를 찍지 않는 나라예요. 집이 있는 나라는 "입국"이 아니라서 빼요.
// Journey.home에는 나라 코드가 없어서, 지금은 서비스 대상(한국에 사는 사람)에 맞춰 한국으로 정해 뒀어요.
// TODO(endl24): Journey.home에 나라 코드가 생기면 그 값으로 바꾸기
export const HOME_COUNTRY_CC = 'KR';

// 여권 한 쪽에 찍는 스탬프 수예요. 피그마 한 쪽이 5개씩 두 줄이에요. 넘치면 다음 쪽으로 넘겨요.
export const STAMPS_PER_PAGE = 10;
