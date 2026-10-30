import { expect, test } from 'vitest';

import { resizePhoto, resizeThumbnail } from '@/utils/upload/resizePhoto';

// 사진 파일 대신 캔버스로 PNG를 만들어 씁니다.
function makeImageFile(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').fillRect(0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(new File([blob], 'photo.png', { type: 'image/png' })));
  });
}

test('보기용과 썸네일을 WebP로 만든다', async () => {
  const file = await makeImageFile(3000, 2000);

  const { full, thumb } = await resizePhoto(file);

  expect(full.type).toBe('image/webp');
  expect(thumb.type).toBe('image/webp');
});

test('썸네일만 만들면 긴 변이 400px인 WebP 한 장을 돌려준다', async () => {
  // given
  const file = await makeImageFile(3000, 2000);

  // when
  const thumb = await resizeThumbnail(file);

  // then
  expect(thumb.type).toBe('image/webp');
  const bitmap = await createImageBitmap(thumb);
  expect(Math.max(bitmap.width, bitmap.height)).toBe(400);
  bitmap.close();
});

test('썸네일만 만들 때도 열 수 없는 파일은 null을 돌려준다', async () => {
  // given
  const file = new File(['not an image'], 'broken.jpg', { type: 'image/jpeg' });

  // when
  const thumb = await resizeThumbnail(file);

  // then
  expect(thumb).toBeNull();
});
