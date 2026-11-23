import exifr from 'exifr';
import { describe, expect, test, vi } from 'vitest';

import uploadEdge from '@/data/fixtures/upload-edge.json';
import { readExif } from '@/utils/upload/readExif';

import { loadFixture } from '../../helpers/loadFixture';

// 브라우저 모드에서는 exifr.parse를 spyOn으로 바꿀 수 없어서 모듈째 감쌉니다.
// 기본은 진짜 parse이고, 불가능한 값 테스트에서만 mockResolvedValueOnce로 태그를 바꿔 넣습니다.
vi.mock('exifr', async (importOriginal) => {
  const { default: real } = await importOriginal();
  return { default: { ...real, parse: vi.fn(real.parse) } };
});

const FIELDS = ['readable', 'takenAt', 'offset', 'timeUncertain', 'lat', 'lng', 'camera'];

/**
 * "cases": [
 *     {
 *       "file": "01_full-exif.jpg",
 *       "why": "기준: 모든 EXIF가 있는 폰 원본",
 *       "expect": {
 *         "readable": true,
 *         "takenAt": "2024-11-24T08:30:49",
 *         "offset": "+09:00",
 *         "timeUncertain": false,
 *         "lat": 34.9949,
 *         "lng": 135.785,
 *         "camera": "Apple iPhone 13",
 *         "imageDecodable": true
 *       }
 *     },
 *     {...},
 *  ]
 */

// GPS는 도·분·초를 십진수로 바꾸면서 126.97800000000001처럼 끝자리가 흔들려서,
// 숫자는 소수점 6자리(약 10cm)까지만 맞으면 같다고 봅니다.
function approx(value) {
  return typeof value === 'number' ? expect.closeTo(value, 6) : value;
}

test.each(uploadEdge.cases)('$file: $why', async ({ file, expect: expected }) => {
  const fixture = await loadFixture(file);
  /*
      fixture = File {
        name: '01_full-exif.jpg',     // 두 번째 인자로 넘긴 이름
        size: 401531,                 // blob의 바이트 수 그대로
        type: '',                     // ← 비어 있음
        lastModified: 1792148...,     // 만든 순간의 시각(밀리초)
      }
*/
  const photo = await readExif(fixture);

  // upload-edge.json은 카메라를 'Apple iPhone 13'처럼 이름만 적어 둡니다.

  // camera: {
  //  make: 'Apple',
  //  model: 'iPhone 13',
  //  focal: 26,
  //  aperture: 1.6,
  //  shutter: 0.00833,
  //  iso: 32
  // }
  const camera = photo.camera && `${photo.camera.make} ${photo.camera.model}`;
  const actual = { ...photo, camera };

  expect(actual).toEqual(Object.fromEntries(FIELDS.map((key) => [key, approx(expected[key])])));
});

// 불가능한 값은 사진 파일로 만들기보다 exifr가 읽은 태그를 바꿔 넣어 확인합니다.
describe('불가능한 촬영 정보', () => {
  const fixture = new File([], 'fake.jpg');

  test.each([
    { why: '위도 95', latitude: 95, longitude: 10 },
    { why: '경도 200', latitude: 10, longitude: 200 },
  ])('$why → 위치 없음', async ({ latitude, longitude }) => {
    vi.mocked(exifr.parse).mockResolvedValueOnce({ latitude, longitude });

    // when
    const photo = await readExif(fixture);

    // then
    expect(photo).toMatchObject({ readable: true, lat: null, lng: null });
  });
});
