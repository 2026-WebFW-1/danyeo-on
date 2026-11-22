// 사진을 제외한 뒤에도 기준 시각이 필요해 여행 계산과 07a 모두 전체 사진을 넘겨요.
const DEFAULT_OFFSET = '+09:00';

/** @param {import('@/types').Photo | undefined} photo @returns {number} */
function takenMs(photo) {
  return photo?.takenAt ? Date.parse(photo.takenAt + (photo.offset ?? DEFAULT_OFFSET)) : NaN;
}

/**
 * @param {import('@/types').Correction[]} corrections
 * @param {Map<string, import('@/types').Photo>} photoById
 * @returns {{id: string, startAt: number, endAt: number}[]}
 */
export function collectMergeSpans(corrections, photoById) {
  const spans = [];
  for (const { id, type, photoIds } of corrections) {
    if (type !== 'merge' || !Array.isArray(photoIds) || photoIds.length !== 2) continue;
    const startAt = takenMs(photoById.get(photoIds[0]));
    const endAt = takenMs(photoById.get(photoIds[1]));
    if (startAt < endAt) spans.push({ id, startAt, endAt });
  }
  return spans;
}

/**
 * 끝점만 맞닿는 이웃 경계까지 합쳐지지 않게 양쪽을 엄격하게 비교해요.
 * @param {{startAt: number, endAt: number}} span
 * @param {number | null} left 앞 지점의 마지막 시각
 * @param {number} right 뒤 지점의 첫 시각
 * @returns {boolean}
 */
export function crossesMergeBoundary(span, left, right) {
  return left !== null && span.startAt < right && left < span.endAt;
}
