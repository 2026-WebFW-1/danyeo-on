// 글에 붙일 그날 사진을 고르는 규칙이에요(#194). 편집기의 사진 줄이 써요.

/**
 * 편집기를 열 때 처음 골라 둘 사진이에요. 글의 사진 중 그날 사진인 것만 글의 순서대로 고르고,
 * 남는 게 없으면(새 글, 사진이 빈 글, 붙은 사진이 모두 지워진 글) 그날 사진 전부예요.
 *
 * @param {Pick<import('@/types').Post, 'photoIds'> | undefined} post 고칠 글. 아직 없으면 undefined
 * @param {string[]} dayPhotoIds 그날 사진 ID, 촬영 순서
 * @returns {string[]} 새 배열. 예: ({ photoIds: ['gone', 'b'] }, ['a', 'b']) → ['b']
 */
export function initialSelection(post, dayPhotoIds) {
  const kept = (post?.photoIds ?? []).filter((id) => dayPhotoIds.includes(id));
  return kept.length > 0 ? kept : [...dayPhotoIds];
}

/**
 * 사진 하나를 다른 자리로 옮겨요.
 *
 * @param {string[]} ids
 * @param {number} from 옮길 사진의 자리
 * @param {number} to 옮겨 갈 자리
 * @returns {string[]} 새 배열. 예: (['a', 'b', 'c'], 2, 0) → ['c', 'a', 'b']
 */
export function movePhoto(ids, from, to) {
  const moved = ids.toSpliced(from, 1);
  return moved.toSpliced(to, 0, ids[from]);
}
