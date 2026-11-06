import { cn } from '@/utils/cn';

import { CARD_CLASS } from './cardClass';

// 피그마 스티커는 칸마다 글자 크기가 달라요: 24px, 18px, 16px(모두 굵게).
const SIZE_CLASS = { large: 'text-3xl', medium: 'text-xl', small: 'text-lg' };

/**
 * 콜라주의 스티커(알약)예요. 글의 태그를 한 줄로 보여 줘요.
 *
 * 호출: Collage가 스티커 칸에 그려요. 크기(size)는 칸이 정해요.
 * <Sticker label="개스타운" size="medium" />
 *
 * @param {object} props
 * @param {string} props.label
 * @param {'large' | 'medium' | 'small'} props.size
 */
export default function Sticker({ label, size }) {
  return (
    <span
      className={cn(
        CARD_CLASS,
        'block py-3 pr-5 pl-4 font-bold whitespace-nowrap text-ink',
        SIZE_CLASS[size],
      )}
    >
      {label}
    </span>
  );
}
