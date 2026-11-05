import { Link } from 'react-router';

import { cn } from '@/utils/cn';

const LINK_CLASS =
  'inline-flex w-fit items-start gap-2 border-b border-ink pb-1 text-md font-bold text-ink';

/**
 * 밑줄과 화살표가 붙은 글자 링크예요. 03의 [챕터 열기 →] [글 보기 →] [지도로 보기 →]가 같은 모양이에요.
 *
 * 호출: 다른 화면으로 가면 to, 그 자리에서 무언가 하면 onClick을 줘요.
 * <ArrowLink to="/chapter/밴쿠버-2025">챕터 열기</ArrowLink>
 * <ArrowLink onClick={handleOpen} aria-expanded={isOpen}>글 보기</ArrowLink>
 *
 * @param {object} props
 * @param {string} [props.to] 주소. 주면 링크(a)로, 안 주면 버튼으로 그려요
 * @param {() => void} [props.onClick]
 * @param {string} [props.arrow] 끝에 붙는 화살표예요. 기본은 →
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function ArrowLink({ to, onClick, arrow = '→', className, children, ...props }) {
  const content = (
    <>
      <span>{children}</span>
      <span aria-hidden="true" className="font-serif">
        {arrow}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn(LINK_CLASS, className)} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(LINK_CLASS, className)} {...props}>
      {content}
    </button>
  );
}
