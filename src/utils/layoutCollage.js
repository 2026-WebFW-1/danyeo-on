import {
  CARD_MAX_HEIGHT,
  CARD_SLOTS,
  CARD_SLOTS_WITHOUT_HERO,
  COLLAGE_BOTTOM_PADDING,
  CONTINUE_ROW_BOTTOM_GAP,
  CONTINUE_ROW_CLEARANCE,
  CONTINUE_ROW_HEIGHT,
  CONTINUE_ROW_LEFT,
  CONTINUE_ROW_RISE,
  HERO_SLOT,
  MEMO_MAX_HEIGHT,
  MEMO_SLOTS,
  PHOTO_SLOTS,
  STICKER_FONT_SIZES,
  STICKER_HEIGHTS,
  STICKER_MAX_LENGTH,
  STICKER_PADDING_X,
  STICKER_SLOTS,
  TILE_PITCH,
  TILE_Z_STEP,
} from '@/constants/collage';

/**
 * 콜라주 한 조각이 놓일 자리예요. 좌표는 콜라주 캔버스(기준 폭 1440px) 안의 값이에요.
 * 기울기가 있는 것은 x·y가 기울이기 전 상자의 왼쪽 위예요.
 *
 * @typedef {object} CollageItem
 * @property {string} key 목록의 key로 쓸 값
 * @property {'hero' | 'card' | 'memo' | 'photo' | 'sticker'} kind
 * @property {number} x
 * @property {number} y
 * @property {number} [width] 없으면 내용 폭이에요(스티커)
 * @property {number} [height] 없으면 내용 높이예요(글 카드·메모 카드·스티커)
 * @property {number} rotate 도(deg)
 * @property {number} z 쌓이는 순서. 클수록 위예요
 * @property {import('@/types').Post} [post] hero · card
 * @property {import('@/types').PhotoRef | null} [photo] hero(위에 붙는 사진) · photo
 * @property {string} [text] memo
 * @property {string} [label] sticker
 * @property {'large' | 'medium' | 'small'} [size] sticker 글자 크기
 */

/**
 * 타일마다 사진·메모·스티커 칸을 몇 개 쓸지 정해요. 글 카드가 칸보다 많으면 같은 타일을 아래로 이어 붙여요.
 * 첫 타일은 hero가 가운데를 차지해서 글 카드 칸이 둘이고(hero가 없으면 넷), 둘째 타일부터는 넷이에요.
 *
 * 첫 타일과 꽉 찬 타일은 칸을 다 써요. 마지막 타일에 글 카드가 한두 장뿐이면 찬 만큼만 꾸며요.
 * 카드는 한 장인데 사진·스티커가 넓은 빈 곳에 흩어져 있으면 휑해 보여서요.
 *
 * @param {number} cardCount hero를 뺀 글 카드 수
 * @param {boolean} hasHero
 * @returns {{ photos: number, memos: number, stickers: number }[]} 타일마다 쓸 칸 수
 */
function planTiles(cardCount, hasHero) {
  const firstCapacity = hasHero ? CARD_SLOTS.length : CARD_SLOTS_WITHOUT_HERO.length;
  const laterCapacity = CARD_SLOTS_WITHOUT_HERO.length;
  const overflow = Math.max(0, cardCount - firstCapacity);
  const tileCount = 1 + Math.ceil(overflow / laterCapacity);

  return Array.from({ length: tileCount }, (_, index) => {
    const placed = Math.min(laterCapacity, overflow - (index - 1) * laterCapacity);
    const fill = index === 0 ? 1 : placed / laterCapacity;

    return {
      photos: Math.ceil(PHOTO_SLOTS.length * fill),
      memos: Math.ceil(MEMO_SLOTS.length * fill),
      stickers: Math.ceil(STICKER_SLOTS.length * fill),
    };
  });
}

/**
 * 콜라주에 흩어 놓을 수 있는 사진이 몇 장인지 세요. 사진을 고를 때(pickChapterPhotos) 얼마나 고를지 정하는 데 써요.
 *
 * @param {number} cardCount hero를 뺀 글 카드 수
 * @param {boolean} hasHero
 * @returns {number}
 */
export function countPhotoSlots(cardCount, hasHero) {
  return planTiles(cardCount, hasHero).reduce((sum, tile) => sum + tile.photos, 0);
}

function shortenLabel(label) {
  return label.length > STICKER_MAX_LENGTH ? `${label.slice(0, STICKER_MAX_LENGTH - 1)}…` : label;
}

// 조각이 차지하는 칸의 크기예요. 높이가 글에 따라 달라지는 것(글 카드·메모 카드·스티커)은 가장 큰 크기로 어림해요.
function getBoxSize(item) {
  if (item.kind === 'card') return { width: item.width, height: CARD_MAX_HEIGHT };
  if (item.kind === 'memo') return { width: item.width, height: MEMO_MAX_HEIGHT };
  if (item.kind === 'sticker') {
    return {
      width: STICKER_PADDING_X + item.label.length * STICKER_FONT_SIZES[item.size],
      height: STICKER_HEIGHTS[item.size],
    };
  }
  return { width: item.width, height: item.height };
}

// 조각이 기울어진 뒤에 닿는 오른쪽 끝과 아래쪽 끝이에요(상자 가운데를 축으로 돌려서 구해요).
function getExtent(item) {
  const { width, height } = getBoxSize(item);
  const angle = (Math.abs(item.rotate) * Math.PI) / 180;
  const rotatedWidth = width * Math.cos(angle) + height * Math.sin(angle);
  const rotatedHeight = height * Math.cos(angle) + width * Math.sin(angle);

  return {
    right: item.x + width / 2 + rotatedWidth / 2,
    bottom: item.y + height / 2 + rotatedHeight / 2,
  };
}

/**
 * 캔버스 높이와 [계속 여행하기] 줄 자리를 조각들이 닿는 곳에서 구해요.
 * 줄은 맨 아래 조각보다 조금 위에 놓고(피그마), 오른쪽 위에 조각이 있으면 그 아래로 내려요.
 * 한 타일이 꽉 찬 경우에는 피그마와 같아서(높이 약 870, 줄 윗변 766) 마지막 타일이 덜 찼을 때만 달라져요.
 */
function measureCanvas(items) {
  const extents = items.map(getExtent);
  const contentBottom = Math.max(0, ...extents.map((extent) => extent.bottom));
  const rowZoneBottom = Math.max(
    0,
    ...extents.filter((extent) => extent.right > CONTINUE_ROW_LEFT).map((extent) => extent.bottom),
  );

  const continueTop = Math.round(
    Math.max(contentBottom - CONTINUE_ROW_RISE, rowZoneBottom + CONTINUE_ROW_CLEARANCE),
  );
  const height = Math.ceil(
    Math.max(
      contentBottom + COLLAGE_BOTTOM_PADDING,
      continueTop + CONTINUE_ROW_HEIGHT + CONTINUE_ROW_BOTTOM_GAP,
    ),
  );

  return { height, continueTop };
}

/**
 * 콜라주에 올릴 것들의 자리를 정해요. 계산만 하고 무작위가 없어서, 같은 입력이면 항상 같은 배치예요.
 * 피그마 02의 한 장면(hero 카드 · 글 카드 둘 · 메모 둘 · 사진 다섯 · 스티커 넷)을 한 타일로 보고,
 * 글 카드가 칸보다 많으면 같은 타일을 아래로 이어 붙여요(planTiles). 칸보다 많은 사진·메모·스티커는 그려지지 않아요.
 *
 * 글 카드는 높이가 글에 따라 달라요. 칸 사이 간격은 가장 큰 카드(제목 2줄 · 본문 3줄)에 맞춰 두어서
 * 어느 글이어도 다른 카드를 덮지 않아요.
 *
 * @param {object} input
 * @param {{ post: import('@/types').Post, photo: import('@/types').PhotoRef | null } | null} [input.hero]
 *   사진이 위에 붙는 큰 카드(챕터 첫날 글). 없으면 첫 타일에도 글 카드 칸 넷을 써요
 * @param {import('@/types').Post[]} [input.cards] hero를 뺀 글 카드(날짜순)
 * @param {{ id: string, text: string }[]} [input.memos] 메모 카드
 * @param {import('@/types').PhotoRef[]} [input.photos] 콜라주에 흩어 놓을 사진(hero 사진은 빼고)
 * @param {string[]} [input.stickers] 스티커 글자
 * @returns {{ items: CollageItem[], height: number, continueTop: number }}
 *   height는 캔버스 높이(첫 타일 맨 위부터), continueTop은 [계속 여행하기] 줄 윗변이에요
 */
export function layoutCollage({ hero = null, cards = [], memos = [], photos = [], stickers = [] }) {
  const tiles = planTiles(cards.length, hero !== null);
  const items = [];

  if (hero) {
    items.push({
      key: `hero-${hero.post.id}`,
      kind: 'hero',
      ...HERO_SLOT,
      rotate: 0,
      post: hero.post,
      photo: hero.photo,
    });
  }

  const next = { card: 0, memo: 0, photo: 0, sticker: 0 };

  tiles.forEach((tile, index) => {
    const offsetY = index * TILE_PITCH;
    const offsetZ = index * TILE_Z_STEP;
    const cardSlots = index === 0 && hero ? CARD_SLOTS : CARD_SLOTS_WITHOUT_HERO;

    cardSlots.forEach((slot) => {
      const post = cards[next.card];
      if (!post) return;
      next.card += 1;
      items.push({
        key: `card-${post.id}`,
        kind: 'card',
        x: slot.x,
        y: slot.y + offsetY,
        width: slot.width,
        rotate: 0,
        z: slot.z + offsetZ,
        post,
      });
    });

    MEMO_SLOTS.slice(0, tile.memos).forEach((slot) => {
      const memo = memos[next.memo];
      if (!memo) return;
      next.memo += 1;
      items.push({
        key: `memo-${memo.id}`,
        kind: 'memo',
        x: slot.x,
        y: slot.y + offsetY,
        width: slot.width,
        rotate: slot.rotate,
        z: slot.z + offsetZ,
        text: memo.text,
      });
    });

    PHOTO_SLOTS.slice(0, tile.photos).forEach((slot) => {
      const photo = photos[next.photo];
      if (!photo) return;
      next.photo += 1;
      items.push({
        key: `photo-${photo.id}`,
        kind: 'photo',
        x: slot.x,
        y: slot.y + offsetY,
        width: slot.width,
        height: slot.height,
        rotate: slot.rotate,
        z: slot.z + offsetZ,
        photo,
      });
    });

    STICKER_SLOTS.slice(0, tile.stickers).forEach((slot) => {
      const label = stickers[next.sticker];
      if (label === undefined) return;
      next.sticker += 1;
      items.push({
        key: `sticker-${label}`,
        kind: 'sticker',
        x: slot.x,
        y: slot.y + offsetY,
        rotate: slot.rotate,
        z: slot.z + offsetZ,
        label: shortenLabel(label),
        size: slot.size,
      });
    });
  });

  return { items: items.toSorted((a, b) => a.z - b.z), ...measureCanvas(items) };
}
