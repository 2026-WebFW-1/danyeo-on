// 03 전체 기록 화면에서 쓰는 값이에요. 숫자는 피그마 03 "에디토리얼 (여행 탭)" 프레임에서 읽은 값이에요.

// 고른 여행을 주소에 남기는 칸 이름이에요. 예: /places?trip=p_c2a066
export const TRIP_PARAM = 'trip';

// 도시 블록은 이 개수까지만 펼쳐 두고, 나머지는 [+ N곳 펼치기]로 접어요(기능 명세 R103).
export const VISIBLE_STOP_COUNT = 3;

// 세로선 굵기(px). 구간이 길수록 굵고, 이 범위 밖으로는 안 나가요.
// 피그마는 551·573km가 1.2px, 2,815km가 1.64px, 8,159km가 2.86px이라 1 + km / 4400으로 맞췄어요.
export const LINE_MIN_PX = 1.2;
export const LINE_MAX_PX = 3;
export const LINE_BASE_PX = 1;
export const KM_PER_LINE_PX = 4400;

// 점 지름(px). 머문 날이 길수록 크고 10px에서 18px 사이예요. 피그마는 5일 10.67, 12일 11.6, 62일 18이에요.
export const DOT_MIN_PX = 10;
export const DOT_MAX_PX = 18;
export const DOT_PX_PER_DAY = 2 / 15;
// 접힌 지점은 머문 날과 상관없이 같은 크기의 빈 점이에요.
export const FOLDED_DOT_PX = 14;

// 도시 블록 안에서 점이 놓이는 높이(블록 맨 위에서 점 중심까지)예요. 사진 맨 위에서 150px이에요.
export const LINE_DOT_TOP_PX = 150;
// 첫 블록 위로 선이 먼저 나와 있는 길이예요. 집에서 오는 구간이 이 선이에요.
export const LINE_INTRO_PX = 20;
