// 01 도착 카드 더미에 마우스를 올리면 펼치는 여행 사진이에요(#187).

// 펼칠 최대 장수예요. 부채꼴 한 줄에 겹쳐도 사진이 보이는 만큼이에요.
export const ARRIVAL_FAN_LIMIT = 8;

// 부채꼴의 반지름(px)이에요. 맨 앞 카드 가운데에서 사진 가운데까지예요.
export const ARRIVAL_FAN_RADIUS = 300;

// 부채꼴의 가운데 방향과 사진 사이 각도(도)예요. 화면 좌표라 180°가 왼쪽, 270°가 위예요.
// 카드 더미가 오른쪽 아래 구석에 있어서 왼쪽 위로만 펼쳐요(186° ~ 270°).
// 180°보다 아래로 내려가면 왼쪽 아래의 타임라인을 가려서 186°에서 시작해요.
export const ARRIVAL_FAN_CENTER_DEG = 228;
export const ARRIVAL_FAN_SPREAD_DEG = 84;
export const ARRIVAL_FAN_MAX_STEP_DEG = 12;

// 사진을 반지름 방향으로 얼마나 기울일지예요. 1이면 바퀴살처럼 눕고, 0이면 똑바로 서요.
export const ARRIVAL_FAN_TILT = 0.35;

// 하나씩 이어서 펼쳐지게 사진마다 늦추는 시간(ms)이에요.
export const ARRIVAL_FAN_STAGGER_MS = 25;
