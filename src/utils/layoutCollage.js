import {
  CARD_SLOTS,
  HERO_SLOT,
  MEMO_SLOTS,
  PHOTO_SLOTS,
  STICKER_MAX_LENGTH,
  STICKER_SLOTS,
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
 * @property {string} [date] memo가 글(posts)에서 온 것이면 그 글의 날짜예요. 눌러서 고칠 때 써요
 * @property {string} [label] sticker
 * @property {'large' | 'medium' | 'small'} [size] sticker 글자 크기
 */

function shortenLabel(label) {
  return label.length > STICKER_MAX_LENGTH ? `${label.slice(0, STICKER_MAX_LENGTH - 1)}…` : label;
}

// 칸마다 같은 순서의 값을 짝지어 조각으로 만들어요. 값이 칸보다 적으면 남는 칸은 비워 두고, 많으면 남는 값은 버려요.
function fillSlots(slots, values, toItem) {
  return slots.flatMap((slot, index) =>
    index < values.length ? [toItem(slot, values[index])] : [],
  );
}

/**
 * 콜라주에 올릴 것들의 자리를 정해요. 계산만 하고 무작위가 없어서, 같은 입력이면 항상 같은 배치예요.
 * 자리는 피그마 02의 한 장면(hero 카드 · 글 카드 둘 · 메모 둘 · 사진 다섯 · 스티커 넷)뿐이에요. 칸보다 적게 주면 남는 칸은
 * 비고, 많이 주면 남는 것은 그려지지 않아요(무엇을 넣을지 고르는 건 selectChapterCollage가 해요).
 *
 * 글 카드는 높이가 글에 따라 달라요. 칸 사이 간격은 가장 큰 카드(제목 2줄 · 본문 3줄)에 맞춰 있어서
 * 어느 글이어도 다른 카드를 덮지 않아요.
 *
 * @param {object} input
 * @param {{ post: import('@/types').Post, photo: import('@/types').PhotoRef | null } | null} [input.hero]
 *   사진이 위에 붙는 큰 카드
 * @param {import('@/types').Post[]} [input.cards] 글 카드(둘까지)
 * @param {{ id: string, text: string, date?: string }[]} [input.memos] 메모 카드(둘까지)
 * @param {import('@/types').PhotoRef[]} [input.photos] 콜라주에 흩어 놓을 사진(다섯까지, hero 사진은 빼고)
 * @param {string[]} [input.stickers] 스티커 글자(넷까지)
 * @returns {CollageItem[]} 쌓이는 순서(z)가 작은 것부터예요
 */
export function layoutCollage({ hero = null, cards = [], memos = [], photos = [], stickers = [] }) {
  const items = [
    ...(hero
      ? [
          {
            key: `hero-${hero.post.id}`,
            kind: 'hero',
            ...HERO_SLOT,
            rotate: 0,
            post: hero.post,
            photo: hero.photo,
          },
        ]
      : []),
    ...fillSlots(CARD_SLOTS, cards, (slot, post) => ({
      key: `card-${post.id}`,
      kind: 'card',
      rotate: 0,
      ...slot,
      post,
    })),
    ...fillSlots(MEMO_SLOTS, memos, (slot, memo) => ({
      key: `memo-${memo.id}`,
      kind: 'memo',
      ...slot,
      text: memo.text,
      date: memo.date,
    })),
    ...fillSlots(PHOTO_SLOTS, photos, (slot, photo) => ({
      key: `photo-${photo.id}`,
      kind: 'photo',
      ...slot,
      photo,
    })),
    ...fillSlots(STICKER_SLOTS, stickers, (slot, label) => ({
      key: `sticker-${label}`,
      kind: 'sticker',
      ...slot,
      label: shortenLabel(label),
    })),
  ];

  return items.toSorted((a, b) => a.z - b.z);
}
