// 02 챕터 화면의 콜라주에서 쓰는 값이에요. 숫자는 피그마 02 "장기 여행 (밴쿠버 62일)" 프레임(5:2)에서 읽은 값이에요.
// 콜라주는 이 한 장면의 칸에만 놓여요. 글이 많아도 화면이 늘어나지 않고, 칸보다 많은 글·사진은 무작위로 골라 넣어요.
// 좌표는 콜라주 맨 위(hero 카드 윗변)를 0으로 하고, 폭은 프레임 폭 1440px이에요.
// 기울어진 것은 기울이기 전 상자의 왼쪽 위 좌표예요(CSS는 상자 가운데를 축으로 돌려서, 피그마와 같은 자리에 놓여요).

// 콜라주를 그리는 기준 폭(px)이에요. 화면이 이보다 좁으면 이 폭대로 그린 뒤 줄여서 보여 줘요.
export const COLLAGE_DESIGN_WIDTH = 1440;

// 콜라주의 맨 위(hero 카드 윗변)가 놓이는 높이예요. Nav 아래에서 130px이고, 이 위에 머리(CHAPTER · 제목 · 기간)가 있어요.
export const COLLAGE_TOP = 130;

// 콜라주 캔버스의 높이예요. 피그마 프레임(1064)에서 Nav(64)와 콜라주 위쪽(130)을 뺀 값이고, 글이 얼마나 많아도 그대로예요.
export const COLLAGE_HEIGHT = 870;

// 사진이 붙은 큰 카드(hero)가 놓이는 칸이에요. 높이는 사진 230 + 글 180에 테두리 2예요.
export const HERO_SLOT = { x: 690, y: 0, width: 402, height: 412, z: 9 };

// 글 카드 칸이에요. 높이는 글에 맞춰 자라고(제목 2줄·본문 3줄까지) 폭만 정해요.
export const CARD_SLOTS = [
  { x: 200, y: 240, width: 380, z: 4 },
  { x: 720, y: 570, width: 360, z: 11 },
];

// 메모 카드 칸이에요. 가장 위의 것만 1.5도 기울어 있어요.
export const MEMO_SLOTS = [
  { x: 1007.8, y: 23.9, width: 300, rotate: 1.5, z: 1 },
  { x: 1050, y: 290, width: 300, rotate: 0, z: 6 },
];

// 사진 칸이에요. 순서는 피그마 위에서 아래로 읽는 순서고, rotate는 도(deg)예요.
export const PHOTO_SLOTS = [
  { x: 522.8, y: 117.3, width: 200, height: 220, rotate: -1.5, z: 3 },
  { x: 1214.3, y: 166.3, width: 210, height: 250, rotate: -2, z: 5 },
  { x: 571.5, y: 433.4, width: 200, height: 200, rotate: 2, z: 7 },
  { x: 1186.2, y: 424.9, width: 190, height: 240, rotate: -3, z: 10 },
  { x: 354.7, y: 634.3, width: 170, height: 200, rotate: 3, z: 13 },
];

// 스티커(알약) 칸이에요. size는 글자 크기예요: large 24px, medium 18px, small 16px.
export const STICKER_SLOTS = [
  { x: 209.6, y: 102.2, rotate: 1, size: 'large', z: 2 },
  { x: 575, y: 648, rotate: 0, size: 'small', z: 8 },
  { x: 999.7, y: 671.3, rotate: 1, size: 'medium', z: 12 },
  { x: 250, y: 570, rotate: 0, size: 'medium', z: 14 },
];

// 스티커 글자가 이보다 길면 줄임표로 잘라요. 한 줄 알약이 칸 밖으로 길게 나가 다른 것을 덮지 않게요.
// 18자는 가장 큰 글자(24px) 칸에서 한글로만 채워도 알약 폭이 약 470px이라 오른쪽의 hero 카드(왼쪽 끝 690)에 닿지 않아요.
// 피그마 샘플의 가장 긴 스티커("한 달에 한 번 비 안 오는 날", 17자)도 잘리지 않고요.
export const STICKER_MAX_LENGTH = 18;

// [계속 여행하기] 줄의 윗변이에요(피그마 y 960에서 콜라주 맨 위 194를 뺀 값). 줄은 캔버스 오른쪽 끝에 붙고 높이가 55px이라
// 아래로 49px이 남아서, 캔버스 높이(870)와 맞아요.
export const CONTINUE_ROW_TOP = 766;
