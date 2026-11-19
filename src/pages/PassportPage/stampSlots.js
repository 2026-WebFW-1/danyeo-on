// 여권 한 쪽(1200 × 640)에 스탬프 10개가 놓이는 자리예요. 피그마 05 "Passport page" 그대로이고, 11번째부터는 다음 쪽에서 되풀이해요.
// 둥근 스탬프(176 × 176)와 네모 스탬프(220 × 140)가 번갈아 놓이고, 자리는 피그마의 돌린 상자 가운데에 스탬프 가운데를 맞춘 값이에요.
// 잉크 색도 피그마 순서 그대로예요. Tailwind가 클래스 이름을 찾을 수 있게 글자를 통째로 적어 둬요.
export const STAMP_SLOTS = [
  { shape: 'round', className: 'top-[84px] left-[28px] rotate-8 text-stamp-ink-1' },
  { shape: 'rect', className: 'top-[99px] left-[242px] -rotate-6 text-stamp-ink-2' },
  { shape: 'round', className: 'top-[105px] left-[512px] rotate-3 text-stamp-ink-3' },
  { shape: 'rect', className: 'top-[65px] left-[731px] -rotate-10 text-accent' },
  { shape: 'round', className: 'top-[96px] left-[997px] rotate-6 text-stamp-ink-1' },
  { shape: 'rect', className: 'top-[391px] left-[4px] -rotate-4 text-stamp-ink-5' },
  { shape: 'round', className: 'top-[368px] left-[261px] rotate-11 text-accent' },
  { shape: 'rect', className: 'top-[379px] left-[481px] -rotate-7 text-stamp-ink-3' },
  { shape: 'round', className: 'top-[391px] left-[757px] rotate-4 text-stamp-ink-2' },
  { shape: 'rect', className: 'top-[365px] left-[973px] -rotate-9 text-stamp-ink-5' },
];
