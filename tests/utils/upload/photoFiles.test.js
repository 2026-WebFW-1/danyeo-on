import { describe, expect, test } from 'vitest';

import { filesFromEntries, filterPhotoFiles, skipReason } from '@/utils/upload/photoFiles';

/**
 * 이름만 있는 빈 File을 만듭니다.
 * 거를 때는 이름만 보도록 합니다.
 */
function makeFile(name, type = '') {
  return new File([], name, { type });
}

describe('skipReason', () => {
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
    const result = skipReason(file);

    // then
    expect(result).toBeNull();
  });

  test('확장자가 대문자여도(아이폰 IMG_0098.JPG) 사진으로 봅니다.', () => {
    // given
    const file = makeFile('IMG_0098.JPG');

    // when
    const result = skipReason(file);

    // then
    expect(result).toBeNull();
  });

  test('Windows에서 HEIC 파일 형식이 빈 문자열이어도 이름으로 사진이라고 봅니다.', () => {
    // given
    const file = makeFile('IMG_0099.heic', '');

    // when
    const result = skipReason(file);

    // then
    expect(result).toBeNull();
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
    const result = skipReason(file);

    // then
    expect(result).toBe('unsupported');
  });

  test('macOS가 남기는 ._ 숨김 파일이면 확장자가 jpg여도 뺍니다.', () => {
    // given
    const file = makeFile('._IMG_0098.JPG');

    // when
    const result = skipReason(file);

    // then
    expect(result).toBe('hidden');
  });

  test('.DS_Store 파일이면 뺍니다.', () => {
    // given
    const file = makeFile('.DS_Store');

    // when
    const result = skipReason(file);

    // then
    expect(result).toBe('hidden');
  });

  test('이름에 점이 여러 개면 마지막 확장자로 판단합니다.', () => {
    // given
    const photo = makeFile('2024.11.24 교토.jpg');
    const video = makeFile('photo.jpg.mov');

    // when
    const photoResult = skipReason(photo);
    const videoResult = skipReason(video);

    // then
    expect(photoResult).toBeNull();
    expect(videoResult).toBe('unsupported');
  });
});

describe('filterPhotoFiles', () => {
  test('사진과 사진 아닌 파일이 섞여 있으면 사진과 뺀 파일을 이유와 함께 원래 순서대로 나눕니다.', () => {
    // given
    const files = ['b.jpg', 'clip.mov', 'a.png', '._b.jpg'].map((name) => makeFile(name));

    // when
    const { photos, skipped } = filterPhotoFiles(files);

    // then
    expect(photos.map((file) => file.name)).toEqual(['b.jpg', 'a.png']);
    expect(skipped).toEqual([
      { fileName: 'clip.mov', reason: 'unsupported' },
      { fileName: '._b.jpg', reason: 'hidden' },
    ]);
  });
});

/**
 * 끌어다 놓은 파일 항목(FileSystemFileEntry)을 흉내 냅니다.
 * 진짜 entry는 브라우저가 실제로 끌어다 놓을 때만 만들어서, filesFromEntries가 쓰는 것만 갖춥니다.
 */
function fileEntry(name) {
  return {
    isFile: true,
    isDirectory: false,
    file: (resolve) => resolve(makeFile(name)),
  };
}

/**
 * 끌어다 놓은 폴더 항목(FileSystemDirectoryEntry)을 흉내 냅니다.
 * 브라우저(Chrome)처럼 readEntries가 한 번에 최대 100개씩 주고, 다 주면 빈 배열을 줍니다.
 */
function directoryEntry(children) {
  return {
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let start = 0;
      return {
        readEntries: (resolve) => {
          const batch = children.slice(start, start + 100);
          start += batch.length;
          resolve(batch);
        },
      };
    },
  };
}

describe('filesFromEntries', () => {
  test('파일만 놓으면 놓은 순서대로 돌려줍니다.', async () => {
    // given
    const entries = [fileEntry('b.jpg'), fileEntry('a.jpg')];

    // when
    const files = await filesFromEntries(entries);

    // then
    const names = files.map((file) => file.name);
    expect(names).toEqual(['b.jpg', 'a.jpg']);
  });

  test('폴더를 놓으면 하위 폴더(dup/)까지 펼칩니다.', async () => {
    // given
    const dup = directoryEntry([fileEntry('IMG_0098.JPG'), fileEntry('IMG_0098 (1).JPG')]);
    const entries = [directoryEntry([fileEntry('01_full-exif.jpg'), dup])];

    // when - entries[*.jpg, dup(dir)]
    const files = await filesFromEntries(entries);

    // then - dir 을 펼쳐서 파일 형태로 제공합니다.
    const names = files.map((file) => file.name);
    expect(names).toEqual(['01_full-exif.jpg', 'IMG_0098.JPG', 'IMG_0098 (1).JPG']);
  });

  test('파일과 폴더를 섞어 놓아도 놓은 순서를 지킵니다.', async () => {
    // given - [a.jpg, dir([b.jpg, c.jpg])]
    const entries = [fileEntry('a.jpg'), directoryEntry([fileEntry('b.jpg')]), fileEntry('c.jpg')];

    // when - [a.jpg, b.jpg, c.jpg]
    const files = await filesFromEntries(entries);

    // then
    const names = files.map((file) => file.name);
    expect(names).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  test('readEntries가 100개씩 나눠 줘도 폴더 안 파일을 다 모읍니다.', async () => {
    // given - readEntries는 폴더 안 항목을 한 번에 다 주는 대신, 최대 100개씩 끊어서 줍니다.
    // 한 번만 부르면 사진이 300장 든 폴더를 놓아도 100장만 넘어가고 에러도 나지 않아 확인해야합니다.
    const children = Array.from({ length: 103 }, (_, index) => fileEntry(`${index}.jpg`));
    const entries = [directoryEntry(children)];

    // when
    const files = await filesFromEntries(entries);

    // then
    expect(files).toHaveLength(103);
    expect(files.at(-1).name).toBe('102.jpg');
  });

  test('빈 폴더를 놓으면 빈 배열을 돌려줍니다.', async () => {
    // given
    const entries = [directoryEntry([])];

    // when
    const files = await filesFromEntries(entries);

    // then
    expect(files).toEqual([]);
  });

  test('사진이 아닌 파일도 거르지 않고 돌려줍니다. 거르기는 filterPhotoFiles 몫입니다.', async () => {
    // given
    const entries = [fileEntry('clip.mov'), fileEntry('a.jpg')];

    // when
    const files = await filesFromEntries(entries);

    // then
    expect(files.map((file) => file.name)).toEqual(['clip.mov', 'a.jpg']);
  });
});
