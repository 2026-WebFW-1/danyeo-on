import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/utils/cn';
import { formatPostDate } from '@/utils/postForm';

import { ARROW_LINK_CLASS } from './arrowLinkClass';

// 날짜 목록의 그림자예요. 피그마 effect 스타일 shadow/md 값이고, Foundations에 그림자 토큰이 없어서 값을 그대로 적어요.
const MENU_SHADOW = 'shadow-[0px_12px_32px_0px_rgba(0,0,0,0.1)]';
const MENU_ITEM = '[role="menuitem"]';
// 열 때 포커스를 줄 날이에요. 글 없는 첫날이고, 모든 날에 글이 있으면 첫날이에요.
const EMPTY_ITEM = '[role="menuitem"][data-has-post="false"]';
const MOVE_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
// 02는 [계속 여행하기]와 같은 줄의 큰 버튼이고, 03은 [글 보기 →]와 같은 글자 링크예요(피그마 02 · 03).
const VARIANT_CLASS = {
  button:
    'flex items-center gap-1.5 rounded-pill border border-ink px-6 py-3.75 text-lg font-bold whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  link: cn(ARROW_LINK_CLASS, 'gap-1.5 whitespace-nowrap'),
};
const PLACEMENT_CLASS = {
  up: 'bottom-full mb-2',
  down: 'top-full mt-2',
};

/**
 * [+ 글 쓰기]와, 누르면 펼치는 날짜 목록이에요(#203 · #216). 날짜를 고르면 그 날짜의 글 편집기(14a)를 열어요.
 *
 * 호출: 02 콜라주 맨 아래 줄(Collage)과 03 도시 블록(CityBlock)에서 써요. 자리는 부르는 쪽이 정해요.
 * <WriteDateMenu days={[{ date: '2025-06-28', dayNumber: 1, hasPost: true }]} onPick={handleEdit} />
 * <WriteDateMenu days={days} onPick={handlePick} variant="link" placement="down" />
 *
 * 의도:
 *  - 글이 없는 날에 쓰러 오는 일이 많아서, 열면 글 없는 첫날에 포커스를 줘요. ↑ ↓ Home End로 옮겨요.
 *  - 고르면 닫고 onPick을 불러요. Esc는 닫고 버튼으로 포커스를 돌려줘요. 바깥을 누르면 닫기만 해요(01 LegModeMenu와 같아요).
 *  - 목록은 380px까지 늘고 그보다 길면 안에서 스크롤돼요. 02 챕터는 늘 14일 이상이라 380px이고, 03은 머문 날만큼이에요.
 *  - 02는 화면 아래 끝이라 위로(placement="up"), 03은 아래로 긴 페이지라 아래로(placement="down") 열어요.
 *  - 피그마: 02 "02 챕터 — [+ 글 쓰기] 날짜 목록 열림 (#203)", 03 "03 전체 기록 — [+ 글 쓰기] 날짜 목록 열림 (#216)".
 *
 * @param {object} props
 * @param {{ date: string, dayNumber: number | null, hasPost: boolean }[]} props.days 고를 수 있는 날(시간 순서)
 * @param {(date: string) => void} props.onPick 고른 날짜(YYYY-MM-DD)
 * @param {'button' | 'link'} [props.variant] 버튼 모양. 기본은 02의 큰 버튼
 * @param {'up' | 'down'} [props.placement] 목록을 여는 방향. 기본은 위
 */
export default function WriteDateMenu({ days, onPick, variant = 'button', placement = 'up' }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    (menu?.querySelector(EMPTY_ITEM) ?? menu?.querySelector(MENU_ITEM))?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (!MOVE_KEYS.includes(event.key)) return;
    event.preventDefault();
    const items = [...menuRef.current.querySelectorAll(MENU_ITEM)];
    const index = items.indexOf(document.activeElement);
    const nextIndex = {
      Home: 0,
      End: items.length - 1,
      ArrowDown: (index + 1) % items.length,
      ArrowUp: (index - 1 + items.length) % items.length,
    }[event.key];
    items[nextIndex].focus();
  };

  const handlePick = (date) => {
    setIsOpen(false);
    onPick(date);
  };

  return (
    // 키는 안쪽의 버튼과 목록에서 올라온 것만 받아요. 이 상자에 포커스가 오지는 않아요.
    // flex로 감싸요. 글자 링크(inline-flex)를 그냥 상자에 두면 줄 높이만큼 내려가서 옆 [글 보기 →]와 줄이 어긋나요.
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative flex w-fit">
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="글 쓸 날짜"
          className={cn(
            'absolute left-0 z-10 flex max-h-95 w-75 flex-col border border-ink bg-white',
            PLACEMENT_CLASS[placement],
            MENU_SHADOW,
          )}
        >
          <p className="border-b border-line px-4 pt-3 pb-2 text-xs text-muted">
            글 쓸 날짜를 골라요
          </p>
          <ul role="none" className="min-h-0 overflow-y-auto">
            {days.map(({ date, dayNumber, hasPost }) => (
              <li key={date} role="none">
                <button
                  type="button"
                  role="menuitem"
                  data-has-post={hasPost}
                  onClick={() => handlePick(date)}
                  className="flex w-full items-baseline gap-2 px-4 py-2 text-left text-md text-ink hover:bg-paper focus-visible:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  <span>{formatPostDate(date)}</span>
                  {dayNumber !== null && <span className="text-xs text-dim">Day {dayNumber}</span>}
                  {hasPost && (
                    <span className="ml-auto text-xs font-medium text-accent">글 있음</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          VARIANT_CLASS[variant],
          variant === 'button' && (isOpen ? 'bg-paper' : 'bg-white hover:bg-paper'),
        )}
      >
        <span aria-hidden="true">+</span>
        <span>글 쓰기</span>
      </button>
    </div>
  );
}
