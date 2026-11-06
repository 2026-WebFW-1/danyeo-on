import { useState } from 'react';

import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';

/**
 * 콜라주의 사진 한 장이에요. 누르면 크게 봐요. 이미지가 없거나 못 불러오면 회색 칸이에요.
 *
 * 호출: Collage가 사진 칸에, PostCard가 hero 카드 위에 써요. 크기는 부르는 쪽이 className으로 정해요.
 * <CollagePhoto photo={photo} onOpen={() => onOpenPhoto(photo)} className="size-full" />
 *
 * 의도:
 *  - 작게 보이는 칸은 thumb(긴 변 400px)을, 큰 hero 카드 위는 full을 불러요(size).
 *  - photo가 null이면(글에 붙은 사진도 지점 사진도 없을 때) 열 사진이 없어서 버튼이 아니라 회색 칸만 둬요.
 *
 * @param {object} props
 * @param {import('@/types').PhotoRef | null} props.photo
 * @param {'thumb' | 'full'} [props.size]
 * @param {() => void} [props.onOpen]
 * @param {string} [props.className]
 */
export default function CollagePhoto({ photo, size = 'thumb', onOpen, className }) {
  const src = usePhoto(photo?.fileKey, size);
  // 못 연 주소만 기억하면, 주소가 바뀌었을 때 effect 없이 다시 시도해요.
  const [failedSrc, setFailedSrc] = useState(null);

  if (photo === null) return <div className={cn('bg-line', className)} />;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="사진 크게 보기"
      className={cn(
        'block cursor-zoom-in overflow-clip bg-line focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
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
    </button>
  );
}
