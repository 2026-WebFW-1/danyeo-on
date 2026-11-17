// 07 화면의 가로 틀이에요. 피그마는 1440 폭에 좌우 120px을 비워서 내용이 1200px이에요(03과 같은 틀).
export const SECTION_CLASS = 'mx-auto w-full max-w-360 px-30';

// 07a 여행 표의 칸 나누기예요. 머리 줄(TRIP · CITIES · PHOTOS)과 여행 줄이 같은 칸에 맞도록 같이 써요.
// 피그마는 체크박스 40 + 여행 300 | 도시 560 | 사진 300이에요. 체크박스(합치기)는 아직 없어서 여행 칸에 넣었어요.
export const TRIP_ROW_GRID_CLASS = 'grid grid-cols-[340px_1fr_300px]';
