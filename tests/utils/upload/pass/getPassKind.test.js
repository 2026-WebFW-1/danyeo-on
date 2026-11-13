import { describe, expect, test } from 'vitest';

import { getPassKind } from '@/utils/upload/pass/getPassKind';

describe('getPassKind', () => {
  test.each([
    ['IMG_0001.jpg', 'auto'],
    ['IMG_0001-edited.jpg', 'show'],
    ['IMG_0001-EDITED.HEIC', 'show'],
    ['여행_편집.png', 'show'],
  ])('%s는 %s예요', (filename, expected) => {
    // given
    const photo = { id: filename, filename };

    // when
    const kind = getPassKind(photo);

    // then
    expect(kind).toBe(expected);
  });
});
