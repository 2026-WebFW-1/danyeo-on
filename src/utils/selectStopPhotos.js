/**
 * 한 지점의 사진을 파일 이름·촬영 시각까지 그대로 돌려줘요.
 * 지점의 photoIds 순서를 그대로 따르고, 사진 목록에 없는 id는 건너뛰어요.
 * 02에서 글을 고칠 때 그날 사진과 그 설명(파일 이름 · 촬영 시각)을 보여 주는 데 써요.
 *
 * @param {Pick<import('@/types').Stop, 'photoIds'>} stop
 * @param {import('@/types').Photo[]} photos 로그인한 사람의 사진 전부(getMyData의 photos)
 * @returns {import('@/types').Photo[]}
 */
export function selectStopPhotoDetails(stop, photos) {
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  return stop.photoIds.flatMap((id) => photosById.get(id) ?? []);
}

/**
 * 한 지점의 사진을 Lightbox·PhotoGrid에 넘길 목록으로 만들어요.
 * 지점의 photoIds 순서를 그대로 따르고, 사진 목록에 없는 id는 건너뛰어요.
 * 이미지가 없는 사진(fileKey: null)은 그대로 남겨서 회색 칸으로 보여 줘요.
 * 사진 목록을 아직 못 받았거나 하나도 못 찾았어도 대표 사진이 있으면 그 한 장은 보여 줘요.
 *
 * @param {Pick<import('@/types').Stop, 'id' | 'photoIds' | 'coverFileKey'>} stop
 * @param {import('@/types').Photo[]} photos 로그인한 사람의 사진 전부(getMyData의 photos)
 * @returns {import('@/types').PhotoRef[]}
 */
export function selectStopPhotos(stop, photos) {
  const refs = selectStopPhotoDetails(stop, photos).map(({ id, fileKey }) => ({ id, fileKey }));

  if (refs.length === 0 && stop.coverFileKey) return [{ id: stop.id, fileKey: stop.coverFileKey }];
  return refs;
}

/**
 * 대표 사진이 목록에서 몇 번째인지 찾아요. 크게 볼 때 그 사진부터 열려고 써요.
 * 대표 사진이 없거나 목록에 없으면 첫 번째예요.
 *
 * @param {import('@/types').PhotoRef[]} refs selectStopPhotos의 결과
 * @param {string | null | undefined} coverFileKey
 * @returns {number}
 */
export function findCoverIndex(refs, coverFileKey) {
  const index = coverFileKey ? refs.findIndex((ref) => ref.fileKey === coverFileKey) : -1;
  return index === -1 ? 0 : index;
}
