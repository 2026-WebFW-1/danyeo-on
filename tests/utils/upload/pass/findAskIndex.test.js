import { describe, expect, test } from 'vitest';

import { findAskIndex } from '@/utils/upload/pass/findAskIndex';

const toPhotos = (filenames) =>
  filenames.map((filename, order) => ({ id: `${order}-${filename}`, order, filename }));

describe('findAskIndex', () => {
  test('답하지 않은 물어볼 사진 중 가장 앞 사진을 찾아요', () => {
    // given
    const photos = toPhotos(['IMG_0001.jpg', 'photo.jpg', 'IMG_0002.jpg', 'beach.jpg']);

    // when
    const index = findAskIndex(photos, {});

    // then
    expect(index).toBe(1);
  });

  test('답한 사진은 빼 두기든 나중에든 건너뛰어요', () => {
    // given
    const photos = toPhotos(['photo.jpg', 'IMG_0001.jpg', 'beach.jpg', 'sky.jpg']);
    const answers = { '0-photo.jpg': 'exclude', '2-beach.jpg': 'later' };

    // when
    const index = findAskIndex(photos, answers);

    // then
    expect(index).toBe(3);
  });

  test('다 답했거나 물어볼 사진이 없으면 -1이에요', () => {
    // given
    const answered = toPhotos(['photo.jpg', 'IMG_0001.jpg']);
    const noAsk = toPhotos(['IMG_0001.jpg', 'IMG_0002-edited.jpg']);

    // when
    const results = [findAskIndex(answered, { '0-photo.jpg': 'later' }), findAskIndex(noAsk, {})];

    // then
    expect(results).toEqual([-1, -1]);
  });
});
