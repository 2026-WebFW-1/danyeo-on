import { describe, expect, test } from 'vitest';

import { filterPhotoFiles, isPhotoFile } from '@/utils/upload/photoFiles';

/**
 * 이름만 있는 빈 File을 만듭니다.
 * 거를 때는 이름만 보도록 합니다.
 */
function makeFile(name, type = '') {
  return new File([], name, { type });
}

describe('isPhotoFile', () => {
  const photoNames = [
    'a.jpg',
    'a.jpeg',
    'a.jfif',
    'a.jpe',
    'a.png',
    'a.heic',
    'a.heif',
    'a.avif',
    'a.tif',
    'a.tiff',
  ];
  test.each(photoNames)('%s 파일이면 사진으로 봅니다.', (name) => {
    // given
    const file = makeFile(name);

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(true);
  });

  test('확장자가 대문자여도(아이폰 IMG_0098.JPG) 사진으로 봅니다.', () => {
    // given
    const file = makeFile('IMG_0098.JPG');

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(true);
  });

  test('Windows에서 HEIC 파일 형식이 빈 문자열이어도 이름으로 사진이라고 봅니다.', () => {
    // given
    const file = makeFile('IMG_0099.heic', '');

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(true);
  });

  // readExif가 촬영 정보를 못 읽는 형식은 받지 않습니다.
  const notPhotoNames = [
    'clip.mov',
    'note.txt',
    'photo.webp',
    'anim.gif',
    'scan.bmp',
    'raw.dng',
    'jpg',
  ];
  test.each(notPhotoNames)('%s 파일이면 사진이 아니라고 봅니다.', (name) => {
    // given
    const file = makeFile(name);

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(false);
  });

  test('macOS가 남기는 ._ 숨김 파일이면 확장자가 jpg여도 뺍니다.', () => {
    // given
    const file = makeFile('._IMG_0098.JPG');

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(false);
  });

  test('.DS_Store 파일이면 뺍니다.', () => {
    // given
    const file = makeFile('.DS_Store');

    // when
    const result = isPhotoFile(file);

    // then
    expect(result).toBe(false);
  });

  test('이름에 점이 여러 개면 마지막 확장자로 판단합니다.', () => {
    // given
    const photo = makeFile('2024.11.24 교토.jpg');
    const video = makeFile('photo.jpg.mov');

    // when
    const photoResult = isPhotoFile(photo);
    const videoResult = isPhotoFile(video);

    // then
    expect(photoResult).toBe(true);
    expect(videoResult).toBe(false);
  });
});

describe('filterPhotoFiles', () => {
  test('사진과 사진 아닌 파일이 섞여 있으면 사진만 원래 순서대로 남깁니다.', () => {
    // given
    const files = ['b.jpg', 'clip.mov', 'a.png', '._b.jpg'].map((name) => makeFile(name));

    // when
    const photos = filterPhotoFiles(files);

    // then
    expect(photos.map((file) => file.name)).toEqual(['b.jpg', 'a.png']);
  });
});
