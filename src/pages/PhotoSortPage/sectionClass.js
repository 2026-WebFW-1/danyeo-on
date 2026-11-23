// 07 화면의 가로 틀이에요. 피그마는 1440 폭에 좌우 120px을 비워서 내용이 1200px이에요(03과 같은 틀).
export const SECTION_CLASS = 'mx-auto w-full max-w-360 px-30';

// 07a 여행 표의 칸 나누기예요. 머리 줄(TRIP · CITIES · PHOTOS)과 여행 줄이 같은 칸에 맞도록 같이 써요.
// 피그마는 체크박스 40 + 여행 300 | 도시 560 | 사진 300이에요. 머리와 본문에 같은 체크박스 칸을 둬요.
export const TRIP_ROW_GRID_CLASS = 'grid grid-cols-[40px_300px_1fr_300px]';

// 제외한 사진 탭의 칸 나누기예요. 머리 줄(PHOTO · TAKEN)과 사진 줄이 같은 칸에 맞도록 같이 써요.
// 피그마에 이 탭의 디자인이 없어서 07a 여행 표의 줄 모양을 따라요. 버튼 칸은 줄 오른쪽 끝이에요.
export const EXCLUDED_ROW_GRID_CLASS = 'grid grid-cols-[96px_1fr_auto] gap-x-10';

// 표 머리 줄의 칸 이름(TRIP · PHOTO 등)이에요. 여행 표와 제외한 사진 탭이 같이 써요.
export const COLUMN_LABEL_CLASS =
  'font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase';
