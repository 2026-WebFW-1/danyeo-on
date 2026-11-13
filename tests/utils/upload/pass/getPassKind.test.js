import { describe, expect, test } from 'vitest';

import { getPassKind } from '@/utils/upload/pass/getPassKind';

describe('getPassKind', () => {
  test.each([
    ['IMG_0001.jpg', 'auto'],
    ['20250712_101530.jpg', 'auto'],
    ['IMG_0001-edited.jpg', 'show'],
    ['IMG_0001-EDITED.HEIC', 'show'],
    ['여행_0712_편집.png', 'show'],
    ['photo.jpg', 'ask'],
    ['바다.mp4', 'ask'],
    ['여행_편집.png', 'ask'],
  ])('%s는 %s예요', (filename, expected) => {
    // given
    const photo = { id: filename, filename };

    // when
    const kind = getPassKind(photo);

    // then
    expect(kind).toBe(expected);
  });
});
