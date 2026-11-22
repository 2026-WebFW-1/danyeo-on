import { group } from '@/utils/journey/group';

// 사진을 제외한 뒤에도 기준 시각이 필요해 여행 계산과 07a 모두 전체 사진을 넘겨요.
const DEFAULT_OFFSET = '+09:00';

/** @param {import('@/types').Photo | undefined} photo @returns {number} */
function takenMs(photo) {
  return photo?.takenAt ? Date.parse(photo.takenAt + (photo.offset ?? DEFAULT_OFFSET)) : NaN;
}

/**
 * 기준 사진을 포함한 당시 여행의 사진만 대체 후보로 써요. 왼쪽은 끝에서, 오른쪽은 처음부터 찾습니다.
 * @param {import('@/types').GroupResult} grouped
 * @param {string} leftId
 * @param {string} rightId
 * @returns {{left: string[], right: string[]}}
 */
function findAnchorCandidates(grouped, leftId, rightId) {
  const stopById = new Map(grouped.stops.map((stop) => [stop.id, stop]));
  const candidates = { left: [leftId], right: [rightId] };
  for (const trip of grouped.trips) {
    const ids = trip.stopIds.flatMap((id) => stopById.get(id).photoIds);
    const left = ids.indexOf(leftId);
    const right = ids.indexOf(rightId);
    if (left !== -1) candidates.left = ids.slice(0, left + 1).reverse();
    if (right !== -1) candidates.right = ids.slice(right);
  }
  return candidates;
}

/**
 * @param {{id: string, left: string[], right: string[]}[]} merges
 * @param {Set<string>} excludedIds
 * @param {Map<string, import('@/types').Photo>} photos
 * @returns {{id: string, photoIds: string[], startAt: number, endAt: number}[]}
 */
function resolveSpans(merges, excludedIds, photos) {
  return merges.flatMap(({ id, left, right }) => {
    const first = left.find((key) => !excludedIds.has(key));
    const last = right.find((key) => !excludedIds.has(key));
    const startAt = takenMs(photos.get(first));
    const endAt = takenMs(photos.get(last));
    return startAt < endAt ? [{ id, photoIds: [first, last], startAt, endAt }] : [];
  });
}

/**
 * @param {import('@/types').Correction[]} corrections 저장 순서
 * @param {Map<string, import('@/types').Photo>} photoById
 * @param {Set<string>} excludedIds
 * @returns {{id: string, photoIds: string[], startAt: number, endAt: number}[]}
 */
export function collectMergeSpans(corrections, photoById, excludedIds = new Set()) {
  const merges = [];
  const earlierExcludes = new Set();
  const earlierSplits = [];
  for (const correction of corrections) {
    const { id, type, photoIds } = correction;
    if (type === 'exclude') earlierExcludes.add(correction.photoId);
    if (type === 'split') earlierSplits.push(takenMs(photoById.get(correction.beforePhotoId)));
    if (type !== 'merge' || !Array.isArray(photoIds) || photoIds.length !== 2) continue;
    const [left, right] = photoIds;
    if (!(takenMs(photoById.get(left)) < takenMs(photoById.get(right)))) continue;

    if (!excludedIds.has(left) && !excludedIds.has(right)) {
      merges.push({ id, left: [left], right: [right] });
      continue;
    }
    // 기준 사진이 제외되면 합칠 당시의 두 여행을 복원해 같은 여행 안에서 대체 사진을 찾아요.
    const savedAt = Date.parse(correction.createdAt);
    const original = [...photoById.values()].filter(
      (photo) => !earlierExcludes.has(photo.id) && !(Date.parse(photo.uploadedAt) > savedAt),
    );
    const grouped = group(
      original,
      earlierSplits,
      resolveSpans(merges, earlierExcludes, photoById),
    );
    merges.push({ id, ...findAnchorCandidates(grouped, left, right) });
  }
  return resolveSpans(merges, excludedIds, photoById);
}
