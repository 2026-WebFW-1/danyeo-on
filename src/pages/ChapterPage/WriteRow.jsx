import { useEffect, useId, useRef, useState } from 'react';

import { CONTINUE_ROW_TOP } from '@/constants/collage';
import { cn } from '@/utils/cn';
import { formatPostDate } from '@/utils/postForm';

// 날짜 목록의 그림자예요. 피그마 effect 스타일 shadow/md 값이고, Foundations에 그림자 토큰이 없어서 값을 그대로 적어요.
const MENU_SHADOW = 'shadow-[0px_12px_32px_0px_rgba(0,0,0,0.1)]';
const MENU_ITEM = '[role="menuitem"]';
// 열 때 포커스를 줄 날이에요. 글 없는 첫날이고, 모든 날에 글이 있으면 첫날이에요.
const EMPTY_ITEM = '[role="menuitem"][data-has-post="false"]';
const MOVE_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/**
 * 챕터 맨 아래 왼쪽의 [+ 글 쓰기]와, 누르면 위로 펼치는 날짜 목록이에요(#203).
 * 날짜를 고르면 글 카드를 눌렀을 때와 같은 편집 화면(14a)이 그 날짜로 열려요.
 *
 * 호출: Collage 캔버스 안에서 그려요. 자리는 캔버스 좌표라서 캔버스와 함께 줄어요.
 * <WriteRow days={[{ date: '2025-06-28', dayNumber: 1, hasPost: true }]} onPick={handleEdit} />
 *
 * 의도:
 *  - [계속 여행하기]와 같은 줄의 반대편이에요. 콜라주 칸은 정해져 있어서 이 자리는 어느 배치에서도 조각과 겹치지 않아요.
 *  - 주 버튼인 [계속 여행하기](검정)보다 한 단계 약하게 흰 바탕에 테두리예요. 높이는 같은 55px이에요(테두리 1px를 빼서 맞춰요).
 *  - 목록은 버튼 위로 열어요. 캔버스 아래 끝에 가까워서 아래로 열면 화면 밖으로 나가요. 길면 목록 안에서 스크롤돼요.
 *  - 글이 없는 날에 쓰러 오는 일이 많아서, 열면 글 없는 첫날에 포커스를 줘요. ↑ ↓ Home End로 옮겨요.
 *  - 고르면 닫고 onPick을 불러요. Esc는 닫고 버튼으로 포커스를 돌려줘요. 바깥을 누르면 닫기만 해요(01 LegModeMenu와 같아요).
 *  - 피그마: 02 챕터 페이지의 "02 챕터 — [+ 글 쓰기] 날짜 목록 열림 (#203)" 프레임이에요.
 *
 * @param {object} props
 * @param {{ date: string, dayNumber: number | null, hasPost: boolean }[]} props.days 고를 수 있는 날(시간 순서)
 * @param {(date: string) => void} props.onPick 고른 날짜(YYYY-MM-DD)
 */
export default function WriteRow({ days, onPick }) {
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
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className="absolute left-15"
      style={{ top: CONTINUE_ROW_TOP }}
    >
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="글 쓸 날짜"
          className={cn(
            'absolute bottom-full left-0 mb-2 flex h-95 w-75 flex-col border border-ink bg-white',
            MENU_SHADOW,
          )}
        >
          <p className="border-b border-line px-4 pt-3 pb-2 text-xs text-muted">
            글 쓸 날짜를 골라요
          </p>
          <ul role="none" className="flex-1 overflow-y-auto">
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
          'flex items-center gap-1.5 rounded-pill border border-ink px-6 py-3.75 text-lg font-bold whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          isOpen ? 'bg-paper' : 'bg-white hover:bg-paper',
        )}
      >
        <span aria-hidden="true">+</span>글 쓰기
      </button>
    </div>
  );
}
