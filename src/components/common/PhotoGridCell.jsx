import { useState } from 'react';

import { usePhoto } from '@/hooks/usePhoto';

/**
 * PhotoGrid의 칸 하나. 작은 사진(thumb)을 그리고, 이미지가 없거나 못 열면 회색 칸이에요.
 *
 * 호출: PhotoGrid 안에서만 써요. 훅은 반복문 안에서 바로 부를 수 없어서 칸을 따로 뒀어요.
 * 의도: onSelect가 없으면 누를 수 없는 칸이라 button이 아니라 div예요.
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {number} props.index 이 칸의 번호. onSelect에 그대로 넘겨요
 * @param {(index: number) => void} [props.onSelect]
 */
export default function PhotoGridCell({ fileKey, index, onSelect }) {
  const src = usePhoto(fileKey, 'thumb');
  // 못 연 주소만 기억하면, 주소가 바뀌었을 때 effect 없이 다시 시도해요.
  const [failedSrc, setFailedSrc] = useState(null);

  const image = src && src !== failedSrc && (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      className="size-full object-cover"
    />
  );

  if (!onSelect) {
    return <div className="aspect-square overflow-hidden bg-line">{image}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-label={`사진 ${index + 1} 크게 보기`}
      className="aspect-square overflow-hidden bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {image}
    </button>
  );
}
