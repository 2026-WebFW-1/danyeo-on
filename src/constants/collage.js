// 02 챕터 화면의 콜라주에서 쓰는 값이에요. 숫자는 피그마 02 "장기 여행 (밴쿠버 62일)" 프레임(5:2)에서 읽은 값이에요.
// 좌표는 프레임 왼쪽 위가 기준이고 폭은 프레임 폭 1440px이에요. y는 한 타일 맨 위(hero 카드 윗변)를 0으로 한 값이에요.
// 기울어진 것은 기울이기 전 상자의 왼쪽 위 좌표예요(CSS는 상자 가운데를 축으로 돌려서, 피그마와 같은 자리에 놓여요).

// 콜라주를 그리는 기준 폭(px)이에요. 화면이 이보다 좁으면 이 폭대로 그린 뒤 줄여서 보여 줘요.
export const COLLAGE_DESIGN_WIDTH = 1440;

// 첫 타일의 맨 위(hero 카드 윗변)가 놓이는 높이예요. Nav 아래에서 130px이고, 이 위에 머리(CHAPTER · 제목 · 기간)가 있어요.
export const COLLAGE_TOP = 130;

// 타일을 이어 붙일 때 다음 타일이 시작하는 간격이에요. 위 타일의 맨 아래 글 카드(570에서 가장 큰 카드 242까지)보다 16px 아래예요.
// 그래서 어느 글이어도 이어 붙인 아래 타일의 첫 글 카드가 위 타일의 글 카드를 덮지 않아요.
export const TILE_PITCH = 828;

// 맨 아래 조각과 캔버스 끝 사이의 여백이에요.
export const COLLAGE_BOTTOM_PADDING = 32;

// 사진이 붙은 큰 카드(hero)는 챕터 첫날 글 하나만 써요. 높이는 사진 230 + 글 180에 테두리 2예요.
export const HERO_SLOT = { x: 690, y: 0, width: 402, height: 412, z: 9 };

// 글 카드와 메모 카드는 높이가 글에 따라 달라서, 자리를 계산할 때는 가장 큰 높이로 쳐요.
// 글 카드는 제목 2줄 · 본문 3줄일 때 242(피그마 Card 2), 메모 카드는 본문 4줄일 때 173.2예요.
export const CARD_MAX_HEIGHT = 242;
export const MEMO_MAX_HEIGHT = 173.2;

// 글 카드 칸이에요. 높이는 글에 맞춰 자라고(제목 2줄·본문 3줄까지) 폭만 정해요.
// 첫 타일은 hero가 가운데를 차지해서 둘이고, 둘째 타일부터는 hero 자리와 가운데 칸도 글 카드가 써서 넷이에요.
export const CARD_SLOTS = [
  { x: 200, y: 240, width: 380, z: 4 },
  { x: 720, y: 570, width: 360, z: 11 },
];
export const CARD_SLOTS_WITHOUT_HERO = [
  { x: 690, y: 0, width: 402, z: 9 },
  ...CARD_SLOTS,
  { x: 700, y: 268, width: 340, z: 10 },
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

// 스티커의 높이(글자 줄 높이에 위아래 여백 24와 테두리 2)와 글자 크기예요. 알약 폭은 글자에 따라 달라서, 자리를 계산할 때는
// 왼쪽·오른쪽 여백(16+20)과 테두리(2)에 글자 수 × 글자 크기로 어림해요(한글 한 자가 글자 크기만큼이에요).
export const STICKER_HEIGHTS = { large: 57.2, medium: 52.1, small: 49.2 };
export const STICKER_FONT_SIZES = { large: 24, medium: 18, small: 16 };
export const STICKER_PADDING_X = 38;

// 스티커 글자가 이보다 길면 줄임표로 잘라요. 한 줄 알약이 칸 밖으로 길게 나가 다른 것을 덮지 않게요.
export const STICKER_MAX_LENGTH = 16;

// 다른 타일끼리 겹칠 때 뒤 타일이 위에 오도록 타일마다 z를 이만큼 더해요.
export const TILE_Z_STEP = 20;

// [계속 여행하기] 줄이에요. 줄은 캔버스 오른쪽 끝에 붙고(NEXT 글자까지 폭 298px이라 왼쪽 끝이 1082), 높이는 55px이에요.
// 피그마는 맨 아래 조각(사진 끝 838.6)보다 72.6px 위에 줄 윗변을 두고, 줄 아래로 49px을 비워요.
export const CONTINUE_ROW_LEFT = 1082;
export const CONTINUE_ROW_HEIGHT = 55;
export const CONTINUE_ROW_RISE = 72.6;
export const CONTINUE_ROW_BOTTOM_GAP = 49;

// 줄 오른쪽 위에 조각이 있으면 줄을 그 아래로 내려요. 이때 조각과 줄 사이에 비우는 간격이에요.
export const CONTINUE_ROW_CLEARANCE = 24;
