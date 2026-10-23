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
  // 사진 파일인지 검사하는 확장자 테스트
  const files = [
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
  test.each(files)('%s는 사진입니다.', (name) => {
    expect(isPhotoFile(makeFile(name))).toBe(true);
  });

  test('확장자는 대소문자를 가리지 않아야 합니다. (아이폰 IMG_0098.JPG)', () => {
    expect(isPhotoFile(makeFile('IMG_0098.JPG'))).toBe(true);
  });

  test('Windows에서 HEIC 형식이 빈 문자열이어도 이름으로 받아요', () => {
    expect(isPhotoFile(makeFile('IMG_0099.heic', ''))).toBe(true);
  });

  // readExif가 촬영 정보를 못 읽는 형식은 받지 않습니다.
  const notPhotoList = [
    'clip.mov',
    'note.txt',
    'photo.webp',
    'anim.gif',
    'scan.bmp',
    'raw.dng',
    'jpg',
  ];
  test.each(notPhotoList)('%s는 사진이 아닙니다.', (name) => {
    expect(isPhotoFile(makeFile(name))).toBe(false);
  });

  test('macOS가 남기는 ._ 숨김 파일은 확장자가 jpg여도 뺍니다.', () => {
    expect(isPhotoFile(makeFile('._IMG_0098.JPG'))).toBe(false);
    expect(isPhotoFile(makeFile('.DS_Store'))).toBe(false);
  });

  test('파일 이름에 점이 많을 경우에도 마지막 확장자를 봐요', () => {
    expect(isPhotoFile(makeFile('2024.11.24 교토.jpg'))).toBe(true);
    expect(isPhotoFile(makeFile('photo.jpg.mov'))).toBe(false);
  });
});

describe('filterPhotoFiles', () => {
  test('사진만 순서대로 남깁니다.', () => {
    const files = ['b.jpg', 'clip.mov', 'a.png', '._b.jpg'].map((name) => makeFile(name));

    expect(filterPhotoFiles(files).map((file) => file.name)).toEqual(['b.jpg', 'a.png']);
  });
});
