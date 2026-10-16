import { expect, test } from 'vitest';

import { resizePhoto } from '@/utils/resizePhoto';

// 사진 파일 대신 캔버스로 PNG를 만들어 씁니다.
function makeImageFile(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').fillRect(0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(
        new File(
          [blob],
          'photo.png',
          { type: 'image/png' }
        )
      )
    );
  });
}

test('보기용과 썸네일을 WebP로 만든다',
  async () => {
    const file = await makeImageFile(3000, 2000);

    const { full, thumb } = await resizePhoto(file);

    expect(full.type).toBe('image/webp');
    expect(thumb.type).toBe('image/webp');
  }
);
