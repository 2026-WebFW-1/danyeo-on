// 05 캘린더 칸의 종류와 범례 글자, 칸 색이에요. 범례와 칸이 같은 색을 쓰도록 한곳에 둬요.
// 아직 안 온 날은 피그마처럼 테두리만 있는 빈 칸이에요. Tailwind가 클래스 이름을 찾을 수 있게 글자를 통째로 적어 둬요.
export const CALENDAR_KINDS = [
  { kind: 'trip', label: '여행한 날', className: 'bg-accent' },
  { kind: 'home', label: '집에 있던 날', className: 'bg-calendar-home' },
  { kind: 'future', label: '아직 안 온 날', className: 'border border-line' },
];
