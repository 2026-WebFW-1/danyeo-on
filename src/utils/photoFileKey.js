// 사용자가 올린 사진은 비공개 photos 버킷에 있어요. 데모 사진(public:, demo:)과 구분하려고 접두사를 붙여요.
const UPLOADED_PREFIX = 'photos:';

/**
 * 새 사진 ID를 만들어요. 한 사람이 수천 장을 올려도 겹치지 않게 seed('p_c2a066')보다 길게 12자로 만들어요.
 * @returns {string} 예: 'p_3f9a0c1b7e42'
 */
export function createPhotoId() {
  return `p_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

/**
 * 올릴 사진의 fileKey를 만들어요. 저장하기 전에 정해서, photos 행과 Storage 파일이 처음부터 같은 사진을 가리키게 해요.
 * @param {string} ownerId 로그인한 사람의 uuid(AuthUser.id)
 * @param {string} photoId 예: 'p_c2a066'
 * @returns {string} 예: 'photos:d0000000-…-0001/p_c2a066'
 */
export function toUploadedFileKey(ownerId, photoId) {
  return `${UPLOADED_PREFIX}${ownerId}/${photoId}`;
}

/**
 * fileKey가 가리키는 photos 버킷 안의 경로예요. 경로 규칙은 BE의 storage 마이그레이션을 따라요.
 * @param {string | null | undefined} fileKey
 * @returns {{ full: string, thumb: string } | null} 올린 사진이 아니면(데모 사진, 이미지 없음) null
 */
export function toUploadedImagePaths(fileKey) {
  if (!fileKey?.startsWith(UPLOADED_PREFIX)) return null;

  const parts = fileKey.slice(UPLOADED_PREFIX.length).split('/');
  if (parts.length !== 2 || parts.some((part) => !part)) return null;

  const [ownerId, photoId] = parts;
  return {
    full: `${ownerId}/full/${photoId}.webp`,
    thumb: `${ownerId}/thumb/${photoId}.webp`,
  };
}
