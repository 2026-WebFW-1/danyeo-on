// 02 콜라주의 조각들이 같이 쓰는 모양이에요. 피그마 02의 글 카드·메모 카드·사진·스티커가 같은 값을 써요.
// 그림자는 Foundations에 토큰이 없어서 피그마 값을 그대로 적어요(01의 PANEL_STYLE과 같은 값이에요).
const SHADOW_CLASS = 'shadow-[0px_8px_24px_0px_rgba(0,0,0,0.07)]';

// 흰 바탕에 테두리가 있는 조각(글 카드 · 메모 카드 · 스티커)이에요.
export const CARD_CLASS = `rounded-xs border border-line bg-white ${SHADOW_CLASS}`;

// 사진 칸이에요. 피그마의 사진 틀도 테두리(1px)와 그림자가 있고, 그림이 그 안쪽을 채워요.
// 흰 바탕은 그림에 가려져서 두지 않아요. 그림이 안 열릴 때는 CollagePhoto의 회색 칸이 보여야 해요.
export const PHOTO_CLASS = `rounded-xs border border-line ${SHADOW_CLASS}`;
