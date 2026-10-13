// `public:`이 붙은 fileKey는 public/ 폴더의 시연용 사진이에요.
const PUBLIC_PREFIX = 'public:';

/**
 * fileKey를 img src 주소로 바꿔요. 지원하지 않는 형식은 null이에요.
 * @param {string | null | undefined} fileKey
 *   예: 'public:/photos/tokyo-1.jpg'
 * @param {'thumb' | 'full'} [size]
 *   업로드 사진용 자리예요. 지금은 안 써요.
 * @returns {string | null}
 *   예: '/photos/tokyo-1.jpg'
 */
// eslint-disable-next-line no-unused-vars
export function photoSource(fileKey, size) {
  if (fileKey?.startsWith(PUBLIC_PREFIX)) {
    return fileKey.slice(PUBLIC_PREFIX.length);
  }
  return null;
}

/**
 * 사진 주소를 돌려주는 훅이에요. 업로드 사진(IndexedDB)을 읽을 때를 위해 훅으로 만들었어요.
 * @param {string | null | undefined} fileKey
 * @param {'thumb' | 'full'} [size]
 * @returns {string | null}
 */
export function usePhoto(fileKey, size = 'full') {
  return photoSource(fileKey, size);
}
