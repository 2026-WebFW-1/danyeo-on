import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useEscape } from '@/hooks/useEscape';
import { cn } from '@/utils/cn';

const TAB_KEY = 'Tab';
const BUTTON_CLASS =
  'px-5 py-3 text-md font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/**
 * 되돌릴 수 없는 일을 하기 전에 한 번 묻는 창이에요. 브라우저 기본 창(window.confirm) 대신 써요(#282).
 * 열려 있는지는 부르는 쪽이 들고 있어요.
 *
 * 호출: isOpen이 false면 아무것도 안 그려요.
 * <ConfirmDialog isOpen={isAsking} title="이 글을 지울까요?" description="되돌릴 수 없어요."
 *   confirmLabel="지우기" isDanger onConfirm={handleConfirm} onCancel={() => setIsAsking(false)} />
 *
 * 의도:
 *  - 닫기(onCancel)는 [취소] · 뒷배경 누르기 · Esc예요. 확인 버튼은 닫지 않고 onConfirm만 불러서, 부르는 쪽이 닫아요.
 *  - 열리면 초점을 [취소]에 둬요. Enter를 잘못 눌러도 지워지지 않게요. 닫히면 열기 전 곳으로 초점을 돌려줘요(Lightbox와 같아요).
 *  - 열려 있는 동안 뒤 화면이 스크롤되지 않게 막아요. window.confirm처럼, 닫았을 때 보던 자리에 그대로 있게요.
 *  - Tab은 두 버튼 사이만 돌아요. 창 뒤의 버튼으로 초점이 빠져나가지 않게요.
 *  - 모양은 피그마 14b의 dialog/leave예요. 그대로 두는 쪽([취소])이 검정 버튼, 일을 벌이는 쪽이 테두리 버튼이에요.
 *    삭제 확인용 프레임은 따로 없어서, isDanger면 [글 지우기]와 같은 강조색(accent)으로 테두리와 글자를 칠해요.
 *  - document.body에 그려요(portal). 부르는 곳의 조상에 transform이 있으면 fixed가 화면이 아니라 그 조상을 기준으로 잡혀서예요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-229
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title 묻는 문장
 * @param {string} [props.description] 덧붙이는 설명
 * @param {string} props.confirmLabel 확인 버튼 문구
 * @param {string} [props.cancelLabel] 기본값은 '취소'예요
 * @param {boolean} [props.isDanger] 지우기처럼 되돌릴 수 없는 확인이면 true
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {string} [props.className]
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  isDanger = false,
  onConfirm,
  onCancel,
  className,
}) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEscape(onCancel, isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    cancelRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const { style } = document.documentElement;
    const previous = { overflow: style.overflow, paddingRight: style.paddingRight };
    // 스크롤 막대가 자리를 차지하는 환경에서는 막대가 사라진 만큼 화면이 옆으로 밀려서, 그 너비를 채워 둬요.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    style.overflow = 'hidden';
    if (scrollbarWidth > 0) style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      style.overflow = previous.overflow;
      style.paddingRight = previous.paddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (event) => {
    if (event.key !== TAB_KEY) return;
    event.preventDefault();
    const next = document.activeElement === cancelRef.current ? confirmRef : cancelRef;
    next.current?.focus();
  };

  // 창 안이 아니라 뒷배경을 직접 눌렀을 때만 닫아요.
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onCancel();
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-nav/45 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn('flex w-110 max-w-full flex-col gap-3 bg-white px-8 py-7', className)}
      >
        <h2 id={titleId} className="text-2xl font-bold text-ink">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-md leading-body-md text-muted">
            {description}
          </p>
        )}
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={cn(BUTTON_CLASS, 'bg-nav text-white')}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              BUTTON_CLASS,
              'border',
              isDanger ? 'border-accent text-accent' : 'border-ink text-ink',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
