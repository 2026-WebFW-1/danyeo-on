// 이동 수단을 추정할 때 "바다를 건너는 구간"을 가리는 표예요(기능 명세 §7의 2번, #247). utils/landRoute.js가 읽어요.
// 지도 데이터로 바다를 직접 재지 않고 나라 코드와 좌표 상자로 어림해요. 틀린 구간은 사용자가 직접 고칠 수 있어요.

const codes = (text) => text.split(' ');

// 육로로 이어진 땅덩이예요. 유럽과 아시아는 기차로 오갈 수 있어서 하나로 봐요.
// 땅덩이가 다르면 가까워도 비행이에요. 예: 스페인 → 모로코, 파나마 → 콜롬비아(길이 끊겨 있어요)
const LANDMASSES = {
  eurasia: codes(
    'AL AD AT BY BE BA BG HR CZ DK EE FI FR DE GR HU IE IT XK LV LI LT LU MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA GI IS MT CY ' +
      'AF AM AZ BH BD BT BN KH CN GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE',
  ),
  africa: codes(
    'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW EH',
  ),
  northAmerica: codes('CA US MX GT BZ SV HN NI CR PA CU JM HT DO BS BB TT PR GL'),
  southAmerica: codes('AR BO BR CL CO EC GY PY PE SR UY VE GF'),
  oceania: codes('AU NZ PG FJ GU MP PW FM MH NC PF VU SB WS TO'),
};

/** 나라 코드 → 땅덩이 이름. 표에 없는 나라는 알 수 없어서 이 규칙을 건너뛰어요. */
export const LANDMASS_BY_CC = new Map(
  Object.entries(LANDMASSES).flatMap(([landmass, ccs]) => ccs.map((cc) => [cc, landmass])),
);

// 다른 나라와 육로(다리 · 터널 포함)로 이어지지 않는 나라예요. 이 나라를 드나드는 구간은 가까워도 비행이에요.
// 한국은 북쪽이 막혀 있어서 넣어요. 영국은 해저 터널로 프랑스와 이어져서(파리 → 런던 기차) 넣지 않아요.
// 인도네시아처럼 일부만 다른 나라와 붙은 나라도 넣지 않아서, 그런 구간은 거리와 속도로만 정해요.
export const NO_LAND_ROUTE_CCS = new Set(
  codes(
    'KR JP TW PH LK MV AU NZ FJ GU MP PW FM MH NC PF VU SB WS TO IS MT CY GL FO CU JM BS BB TT PR MG MU SC KM CV ST',
  ),
);

// 본토와 다리 · 터널 · 기차 배로 이어지지 않고 주로 비행기로 가는 섬이에요. 같은 나라 안의 바다를 가리려고 둬요.
// 한쪽 끝만 상자 안에 있으면 비행이에요. 예: 서울 → 제주(450km). 섬 안에서 움직이는 구간은 거리로 정해요.
// 홋카이도(해저 터널) · 시칠리아(기차 배)처럼 기차로 닿는 섬은 넣지 않아요.
// 사르데냐와 코르시카는 한 상자예요. 둘 사이는 비행기가 아니라 차를 싣는 배(50분)로 오가서, 나누면 그 구간이 비행으로 나와요.
export const ISLAND_REGIONS = [
  { name: '제주', south: 33.0, north: 34.1, west: 126.0, east: 127.1 },
  { name: '울릉도 · 독도', south: 37.2, north: 37.7, west: 130.6, east: 132.0 },
  { name: '오키나와', south: 24.0, north: 29.0, west: 122.8, east: 131.5 },
  { name: '하이난', south: 18.0, north: 20.15, west: 108.5, east: 111.2 },
  { name: '푸꾸옥', south: 9.9, north: 10.5, west: 103.8, east: 104.15 },
  { name: '사무이', south: 9.38, north: 9.85, west: 99.9, east: 100.15 },
  { name: '사르데냐 · 코르시카', south: 38.8, north: 43.1, west: 8.1, east: 9.9 },
  { name: '발레아레스', south: 38.6, north: 40.1, west: 1.1, east: 4.4 },
  { name: '크레타', south: 34.8, north: 35.7, west: 23.4, east: 26.4 },
  { name: '태즈메이니아', south: -43.7, north: -39.4, west: 143.8, east: 148.5 },
];
