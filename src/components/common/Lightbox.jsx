import { useEffect, useRef, useState } from 'react';

import { useEscape } from '@/hooks/useEscape';
import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';
import { getNextIndex, getPrevIndex } from '@/utils/photoIndex';

const ARROW_LEFT_KEY = 'ArrowLeft';
const ARROW_RIGHT_KEY = 'ArrowRight';

const BUTTON_CLASS =
  'absolute flex size-12 items-center justify-center text-3xl text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/**
 * 사진 한 장을 화면 가득 크게(full) 띄우는 부품. 어느 사진이 열려 있는지는 부르는 쪽이 들고 있어요.
 *
 * 호출: index가 null이면 아무것도 안 그려요.
 * <Lightbox photos={photos} index={openIndex} onClose={() => setOpenIndex(null)} onChange={setOpenIndex} />
 *
 * 의도:
 *  - 닫기는 닫기 버튼·뒷배경 누르기·Esc, 넘기기는 이전·다음 버튼과 ←/→ 키예요.
 *    처음·끝에서는 그쪽 버튼이 없어요(돌지 않아요).
 *  - 열리면 창에 포커스를 둬서 ←/→ 키가 들리고, 닫히면 누르기 전 곳으로 포커스를 돌려줘요.
 *  - 사진이 없거나 못 열면 회색 칸을 크게 보여 줘요. 뒷배경은 피그마 scrim-solid(검정 85%)예요.
 *
 * @param {object} props
 * @param {import('@/types').PhotoRef[]} props.photos
 * @param {number | null} props.index 열린 사진의 번호. null이면 닫힌 상태예요
 * @param {() => void} props.onClose
 * @param {(index: number) => void} props.onChange 넘길 때 새 번호를 알려 줘요
 * @param {string} [props.className]
 */
export default function Lightbox({ photos, index, onClose, onChange, className }) {
  const dialogRef = useRef(null);
  const photo = index === null ? undefined : photos[index];
  const isOpen = photo !== undefined;

  const src = usePhoto(photo?.fileKey, 'full');
  const [failedSrc, setFailedSrc] = useState(null);

  useEscape(onClose, isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    dialogRef.current?.focus();
    return () => previousFocus?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const prevIndex = getPrevIndex(index, photos.length);
  const nextIndex = getNextIndex(index, photos.length);

  const handleKeyDown = (event) => {
    if (event.key === ARROW_LEFT_KEY && prevIndex !== null) onChange(prevIndex);
    if (event.key === ARROW_RIGHT_KEY && nextIndex !== null) onChange(nextIndex);
  };

  // 사진이나 버튼이 아니라 뒷배경을 직접 눌렀을 때만 닫아요.
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  // 버튼(48px, 가장자리에서 16px)이 밝은 사진에 겹쳐 안 보이지 않게 둘레를 비워요(px-20 py-16).
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-20 py-16 outline-none',
        className,
      )}
    >
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt=""
          onError={() => setFailedSrc(src)}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <div className="size-120 max-h-full max-w-full bg-line" />
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className={cn(BUTTON_CLASS, 'top-4 right-4')}
      >
        <span aria-hidden="true">×</span>
      </button>
      {prevIndex !== null && (
        <button
          type="button"
          onClick={() => onChange(prevIndex)}
          aria-label="이전 사진"
          className={cn(BUTTON_CLASS, 'top-1/2 left-4 -translate-y-1/2')}
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
      {nextIndex !== null && (
        <button
          type="button"
          onClick={() => onChange(nextIndex)}
          aria-label="다음 사진"
          className={cn(BUTTON_CLASS, 'top-1/2 right-4 -translate-y-1/2')}
        >
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
