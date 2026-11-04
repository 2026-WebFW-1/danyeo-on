import { expect, test } from 'vitest';

import { toUploadedFileKey, toUploadedImagePaths } from '@/utils/photoFileKey';

const OWNER = 'd0000000-0000-4000-8000-000000000001';

test('만든 fileKey로 BE 경로 규칙대로 보기용·썸네일 경로를 돌려줘요', () => {
  const fileKey = toUploadedFileKey(OWNER, 'p_c2a066');

  expect(fileKey).toBe(`photos:${OWNER}/p_c2a066`);
  expect(toUploadedImagePaths(fileKey)).toEqual({
    full: `${OWNER}/full/p_c2a066.webp`,
    thumb: `${OWNER}/thumb/p_c2a066.webp`,
  });
});

test.each([
  ['데모 사진', `demo:${OWNER}/seojin/tokyo-1.webp`],
  ['로컬 시연 사진', 'public:/photos/tokyo-1.webp'],
  ['이미지 없음', null],
  ['사진 ID 없음', `photos:${OWNER}/`],
  ['경로가 더 깊음', `photos:${OWNER}/a/b`],
])('올린 사진이 아니면 null이에요: %s', (_, fileKey) => {
  expect(toUploadedImagePaths(fileKey)).toBeNull();
});
