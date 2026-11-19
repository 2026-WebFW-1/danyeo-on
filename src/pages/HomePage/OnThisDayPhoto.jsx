import { useState } from 'react';

import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';

/**
 * 00b의 사진 한 장이에요. 이미지가 없거나 못 열면 회색 칸이에요(R108).
 *
 * 호출: OnThisDayScene 안에서만 써요. 큰 사진은 full, 작은 사진은 thumb예요.
 * <OnThisDayPhoto fileKey={stop.coverFileKey} size="full" className="aspect-56/62 w-full" />
 *
 * 의도: 누르는 동작이 피그마에 없어서 버튼이 아니에요. 도시 이름은 옆 제목에 있어서 alt는 비워요.
 * 첫 화면 아래에 있어서 loading="lazy"로 스크롤해 다가갈 때 받아요.
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {'thumb' | 'full'} props.size
 * @param {string} [props.className] 칸의 크기
 */
export default function OnThisDayPhoto({ fileKey, size, className }) {
  const src = usePhoto(fileKey, size);
  // 못 연 주소만 기억하면, 주소가 바뀌었을 때 effect 없이 다시 시도해요.
  const [failedSrc, setFailedSrc] = useState(null);

  return (
    <div className={cn('overflow-hidden bg-line', className)}>
      {src && src !== failedSrc && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}
