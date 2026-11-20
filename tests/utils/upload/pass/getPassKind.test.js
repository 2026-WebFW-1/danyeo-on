import { describe, expect, test } from 'vitest';

import { getPassKind } from '@/utils/upload/pass/getPassKind';

const TAKEN_AT = '2025-07-12T10:15:30';

describe('getPassKind', () => {
  test.each([
    ['photo.jpg', TAKEN_AT, 'auto'],
    ['IMG_0001-edited.jpg', TAKEN_AT, 'show'],
    ['IMG_0001-EDITED.HEIC', TAKEN_AT, 'show'],
    ['여행_편집.png', TAKEN_AT, 'show'],
    ['IMG_0001.jpg', null, 'ask'],
    ['IMG_0001-edited.jpg', null, 'ask'],
  ])('%s(촬영 시각 %s)는 %s예요', (filename, takenAt, expected) => {
    // given
    const photo = { id: filename, filename, takenAt };

    // when
    const kind = getPassKind(photo);

    // then
    expect(kind).toBe(expected);
  });
});
