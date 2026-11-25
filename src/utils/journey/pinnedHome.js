/**
 * 사용자가 집으로 지정한 사진의 좌표를 찾아요.
 * home 보정은 마지막 하나만 봐요. 그 보정이 비었거나 사진을 못 찾거나 위치가 없으면, 앞선 home 보정으로 돌아가지 않고 지정 없음이에요.
 * 사진을 영구 삭제하면 서버가 연결을 지워 photoIds가 빈 배열로 오고, 그러면 자동 판단으로 돌아가요.
 *
 * @param {import('@/types').Correction[]} corrections 만든 순서
 * @param {Map<string, import('@/types').Photo>} photoById 제외 전 전체 사진. 07에서 뺀 사진이어도 지정이 남아요
 * @returns {{ photoId: string, lat: number, lng: number } | null}
 */
export function findPinnedHome(corrections, photoById) {
  const last = corrections.findLast((correction) => correction.type === 'home');
  if (!last || !Array.isArray(last.photoIds) || last.photoIds.length === 0) return null;

  const photoId = last.photoIds[0];
  const photo = photoById.get(photoId);
  if (!photo || !Number.isFinite(photo.lat) || !Number.isFinite(photo.lng)) return null;
  return { photoId, lat: photo.lat, lng: photo.lng };
}
