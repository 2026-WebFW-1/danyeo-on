// 01 지도 확대의 범위와 빠르기예요(#184).

// 1배는 세계 지도 전체예요. 8배면 부산 → 경주(79km)처럼 짧은 구간도 점 두 개가 떨어져 보여요.
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 8;

// + / − 버튼을 한 번 누를 때의 배율이에요.
export const MAP_ZOOM_STEP = 1.5;

// 휠을 굴린 양(px)을 배율로 바꾸는 값이에요. 한 칸(100px)에 약 1.2배예요.
// 트랙패드 두 손가락 오므리기는 ctrlKey가 붙은 작은 값으로 와서 더 크게 쳐요.
export const WHEEL_ZOOM_SPEED = 0.002;
export const PINCH_ZOOM_SPEED = 0.01;

// 이만큼(화면 px) 넘게 움직여야 끌기로 봐요. 그보다 적으면 지점 누르기예요.
export const DRAG_THRESHOLD_PX = 4;
