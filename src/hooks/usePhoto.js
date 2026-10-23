// `public:`이 붙은 fileKey는 public/ 폴더의 시연용 사진이에요.
const PUBLIC_PREFIX = 'public:';

/**
 * fileKey를 img src 주소로 바꿔요. 지원하지 않는 형식은 null이에요.
 * 시연용 사진은 같은 이름으로 full/(긴 변 2048)과 thumb/(긴 변 400) 두 벌이 있어요.
 * 목록·카드처럼 작게 보이는 곳은 thumb, 크게 펼쳐 보는 곳은 full을 써요.
 * @param {string | null | undefined} fileKey
 *   예: 'public:/photos/tokyo-1.webp'
 * @param {'thumb' | 'full'} [size]
 * @returns {string | null}
 *   예: '/photos/full/tokyo-1.webp', '/photos/thumb/tokyo-1.webp'
 */
export function photoSource(fileKey, size = 'full') {
  if (!fileKey?.startsWith(PUBLIC_PREFIX)) return null;

  const path = fileKey.slice(PUBLIC_PREFIX.length);
  const slashIndex = path.lastIndexOf('/');
  return `${path.slice(0, slashIndex)}/${size}${path.slice(slashIndex)}`;
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
