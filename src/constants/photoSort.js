// 07 사진 정리가 보던 탭을 주소에 남기는 칸 이름이에요. 예: /edit/photos?tab=unlocated
export const SORT_TAB_PARAM = 'tab';

// 07의 탭이에요. 순서대로 그려요. 13 올리기 결과에서 위치 확인(07b)으로 바로 보낼 때도 이 값을 써요.
export const SORT_TABS = [
  { key: 'trips', label: '여행 묶음' },
  { key: 'unlocated', label: '위치 확인 필요' },
  { key: 'excluded', label: '제외한 사진' },
];

// ?tab=이 없거나 모르는 값이면 여행 묶음(07a)을 보여 줘요.
export const DEFAULT_SORT_TAB = 'trips';

// 07a 여행 줄에 보여 줄 썸네일 수예요(피그마 07a).
export const SORT_THUMB_COUNT = 3;

// 여행 이름을 고칠 때 받는 최대 글자 수예요. 01 · 03의 탭과 제목에서 한 줄에 들어가는 길이로 잡았어요.
export const SORT_NAME_MAX_LENGTH = 30;
