import { expect, test, vi } from 'vitest';

import uploadEdge from '@/data/fixtures/upload-edge.json';
import { readPhotos } from '@/utils/upload/readPhotos';

import { loadFixture } from '../../helpers/loadFixture';

const FIELDS = ['takenAt', 'offset', 'timeUncertain', 'lat', 'lng', 'camera'];

// 폴더에서 고른 File의 name에는 경로가 없어서, dup/ 같은 하위 폴더 이름을 떼고 만듭니다.
async function pickFixture(path) {
  return new File([await loadFixture(path)], path.split('/').at(-1));
}

function caseOf(path) {
  return uploadEdge.cases.find((item) => item.file === path);
}

// readExif 테스트와 같이 GPS 끝자리 흔들림은 소수점 6자리까지만 봅니다.
function approx(value) {
  return typeof value === 'number' ? expect.closeTo(value, 6) : value;
}

test('fixture를 모두 읽으면 읽은 사진은 고른 순서대로, 못 읽은 파일은 이유와 함께 나눠요', async () => {
  // given
  const files = await Promise.all(uploadEdge.cases.map(({ file }) => pickFixture(file)));

  // when
  const { photos, skipped } = await readPhotos(files);

  // then: upload-edge.json은 카메라를 'Apple iPhone 13'처럼 이름만 적어 둡니다
  const actual = photos.map((photo) => ({
    order: photo.order,
    fileName: photo.fileName,
    ...Object.fromEntries(FIELDS.map((key) => [key, photo[key]])),
    camera: photo.camera && `${photo.camera.make} ${photo.camera.model}`,
  }));
  const expected = uploadEdge.cases
    .map(({ file, expect: values }, order) => ({ file, values, order }))
    .filter(({ values }) => values.readable)
    .map(({ file, values, order }) => ({
      order,
      fileName: file.split('/').at(-1),
      ...Object.fromEntries(FIELDS.map((key) => [key, approx(values[key])])),
    }));
  expect(actual).toEqual(expected);
  expect(skipped).toEqual(
    uploadEdge.cases
      .filter(({ expect: values }) => !values.readable)
      .map(({ file }) => ({ fileName: file, reason: 'unreadable' })),
  );
});

test('이름과 촬영 시각이 같아야 같은 키이고, 촬영 시각이 없으면 키가 없어요', async () => {
  // given
  const paths = ['dup/IMG_0098.JPG', 'dup/IMG_0098 (1).JPG', 'KakaoTalk_20241125_103012.jpg'];
  const files = await Promise.all(paths.map(pickFixture));

  // when
  const { photos } = await readPhotos(files);

  // then
  expect(photos.map((photo) => photo.dedupeKey)).toEqual([
    `${caseOf('dup/IMG_0098.JPG').expect.takenAt}|IMG_0098.JPG`,
    `${caseOf('dup/IMG_0098 (1).JPG').expect.takenAt}|IMG_0098 (1).JPG`,
    null,
  ]);
});

test('못 읽은 파일이 있어도 다음 장으로 넘어가며 개수와 진행 상황을 알려요', async () => {
  // given
  const paths = [
    '16_not-an-image.jpg',
    '05_no-date-gps-only.jpg',
    '03_no-gps.jpg',
    '01_full-exif.jpg',
  ];
  const files = await Promise.all(paths.map(pickFixture));
  const onProgress = vi.fn();

  // when
  const { photos, counts } = await readPhotos(files, { onProgress });

  // then
  expect(photos.map((photo) => photo.order)).toEqual([1, 2, 3]);
  expect(counts).toEqual({ unreadable: 1, noDate: 1, noLocation: 1 });
  expect(onProgress.mock.calls).toEqual([
    [{ done: 1, total: 4 }],
    [{ done: 2, total: 4 }],
    [{ done: 3, total: 4 }],
    [{ done: 4, total: 4 }],
  ]);
});
