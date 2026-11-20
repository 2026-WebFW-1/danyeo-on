// 01 도착 카드 더미에 마우스를 올리면 펼치는 여행 사진이에요(#187).

// 사진을 흩뿌릴 기준 자리예요. 맨 앞 카드 가운데를 기준으로 한 px이에요.
// 펼칠 때마다 이 자리를 섞어 고르고, 자리마다 조금씩 무작위로 어긋나게 놓아요(scatterFanPoses).
// 아무 데나 던지면 사진끼리 한곳에 몰리거나 화면 밖으로 나가서, 고르게 퍼진 기준 자리에서 흔드는 방식이에요.
// 카드에 가까운 자리부터 적어요. 사진이 적으면 가까운 자리 몇 곳 중에서 골라요.
export const ARRIVAL_FAN_SLOTS = [
  { x: -70, y: -230 },
  { x: -250, y: -50 },
  { x: -30, y: -330 },
  { x: -260, y: -235 },
  { x: -450, y: -110 },
  { x: -450, y: -290 },
  { x: -640, y: -195 },
  { x: -620, y: -360 },
];

// 펼칠 최대 장수예요. 자리 수만큼이에요.
export const ARRIVAL_FAN_LIMIT = ARRIVAL_FAN_SLOTS.length;

// 사진이 적을 때, 장수보다 이만큼 더 많은 가까운 자리 중에서 골라요. 매번 같은 자리에만 놓이지 않게요.
export const ARRIVAL_FAN_SPARE_SLOTS = 2;

// 기준 자리에서 어긋나는 최대 거리(px)와 기울기(도)예요.
export const ARRIVAL_FAN_JITTER_X = 45;
export const ARRIVAL_FAN_JITTER_Y = 35;
export const ARRIVAL_FAN_MAX_ROTATE = 13;

// 어긋나도 이 범위 밖으로는 나가지 않아요. 1024 × 768 창에서 타임라인 · 범례(왼쪽 아래),
// 기간 탭 · 머리(위), 확대 버튼(오른쪽 위)을 가리지 않는 범위예요.
export const ARRIVAL_FAN_BOUNDS = { minX: -640, maxX: -30, minY: -360, maxY: -50 };

// 하나씩 이어서 던져지게 사진마다 늦추는 시간(ms)이에요.
export const ARRIVAL_FAN_STAGGER_MS = 35;
