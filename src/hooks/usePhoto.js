import { useEffect, useState } from 'react';

import { getPhotoImageUrl } from '@/services/photoService';
import { toUploadedImagePaths } from '@/utils/photoFileKey';

// `public:`이 붙은 fileKey는 public/ 폴더의 시연용 사진이에요.
const PUBLIC_PREFIX = 'public:';
const DEMO_PREFIX = 'demo:';

/**
 * fileKey를 img src 주소로 바꿔요. 지원하지 않는 형식은 null이에요.
 * public:은 기존 로컬 사진, demo:는 Supabase demo-assets의 공개 사진이에요.
 * 같은 이름으로 full/(긴 변 최대 2048)과 thumb/(최대 400) 두 벌이 있어요.
 * 목록·카드처럼 작게 보이는 곳은 thumb, 크게 펼쳐 보는 곳은 full을 써요.
 * @param {string | null | undefined} fileKey
 *   예: 'public:/photos/tokyo-1.webp'
 * @param {'thumb' | 'full'} [size]
 * @returns {string | null}
 *   예: '/photos/full/tokyo-1.webp', '/photos/thumb/tokyo-1.webp'
 */
export function photoSource(fileKey, size = 'full') {
  if (size !== 'full' && size !== 'thumb') return null;
  if (fileKey?.startsWith(DEMO_PREFIX)) {
    // 주소만 조합하므로 공개 사진을 읽는 데 로그인 세션·API 키는 필요하지 않아요.
    const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
    const parts = fileKey.slice(DEMO_PREFIX.length).split('/');
    if (
      !base ||
      parts.length !== 3 ||
      parts.some((part) => !part || part === '.' || part === '..')
    ) {
      return null;
    }
    const [owner, persona, filename] = parts.map(encodeURIComponent);
    return `${base}/storage/v1/object/public/demo-assets/${owner}/${persona}/${size}/${filename}`;
  }
  if (!fileKey?.startsWith(PUBLIC_PREFIX)) return null;

  const path = fileKey.slice(PUBLIC_PREFIX.length);
  const slashIndex = path.lastIndexOf('/');
  return `${path.slice(0, slashIndex)}/${size}${path.slice(slashIndex)}`;
}

/**
 * 사진 주소를 돌려주는 훅이에요.
 * 직접 올린 사진(photos:)은 비공개 버킷이라 서명 주소를 받아 와야 해서, 받기 전과 못 받으면 null(회색 칸)이에요.
 * @param {string | null | undefined} fileKey
 * @param {'thumb' | 'full'} [size]
 * @returns {string | null}
 */
export function usePhoto(fileKey, size = 'full') {
  const isUploaded = toUploadedImagePaths(fileKey) !== null;
  const requestKey = isUploaded ? `${fileKey}|${size}` : null;
  // 주소가 어느 요청의 것인지 같이 두어, fileKey가 바뀐 직후 이전 사진 주소를 보여 주지 않아요.
  const [signed, setSigned] = useState({ requestKey: null, url: null });

  useEffect(() => {
    if (!requestKey) return undefined;
    let isCurrent = true;
    getPhotoImageUrl(fileKey, size).then(
      (url) => isCurrent && setSigned({ requestKey, url }),
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [fileKey, size, requestKey]);

  if (!isUploaded) return photoSource(fileKey, size);
  return signed.requestKey === requestKey ? signed.url : null;
}
