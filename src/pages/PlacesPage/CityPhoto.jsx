import { useState } from 'react';

import { usePhoto } from '@/hooks/usePhoto';

/**
 * 도시 블록의 큰 사진(500×360)이에요. 누르면 크게 보기를 열어요.
 *
 * 호출: CityBlock 안에서만 써요.
 * <CityPhoto fileKey={stop.coverFileKey} label="밴쿠버" onOpen={handleOpen} />
 *
 * 의도: 이미지가 없거나 못 열면 회색 칸이에요. 마우스를 올리거나 키보드로 옮기면 어두워지며 VIEW가 떠요(피그마 PhotoLink).
 * 500px 칸에 400px 썸네일은 흐려서 full(최대 2048px)을 써요. 화면 밖 사진은 loading="lazy"로 늦게 받아요.
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {string} props.label 사진이 속한 도시 이름. 버튼 이름에 써요
 * @param {() => void} props.onOpen
 */
export default function CityPhoto({ fileKey, label, onOpen }) {
  const src = usePhoto(fileKey, 'full');
  // 못 연 주소만 기억하면, 주소가 바뀌었을 때 effect 없이 다시 시도해요.
  const [failedSrc, setFailedSrc] = useState(null);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} 사진 크게 보기`}
      className="group relative block aspect-25/18 w-full max-w-125 overflow-hidden bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/30 group-focus-visible:bg-ink/30"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 m-auto flex size-14 items-center justify-center gap-1.5 rounded-pill bg-nav font-serif text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        VIEW <span>→</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-pill bg-white text-lg font-bold text-ink"
      >
        ↗
      </span>
    </button>
  );
}
