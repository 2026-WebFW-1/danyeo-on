import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tokens.css에서 새로 만든 이름 중 tailwind-merge가 모르는 것을 알려 줘요.
 * 모르는 크기 이름(text-hero)은 글자 색으로 착각해서, 같이 쓴 text-ink를 지워 버려요.
 * 2xs~8xl, xs·sm·md는 원래 알아봐서 적지 않아요.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'display-sm', 'display-md', 'display-lg'],
      leading: ['body-md', 'body-lg'],
      radius: ['pill', 'round'],
    },
  },
});

/**
 * 조건에 따라 Tailwind 클래스를 합쳐요.
 * 뒤에 오는 클래스가 앞의 같은 종류 클래스를 덮어써요 (`p-2`, `p-4` → `p-4`).
 * 그래서 부모가 넘긴 className으로 컴포넌트 기본 스타일을 바꿀 수 있어요.
 * @param {...(string | false | null | undefined | Record<string, boolean>)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
