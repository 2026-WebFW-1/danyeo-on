import { expect, test } from 'vitest';

import uploadEdge from '@/data/fixtures/upload-edge.json';
import { readExif } from '@/utils/readExif';

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

/**
 * <p>fixture 사진을 불러와 사용자가 input으로 고른 것과 같은 File로 만듭니다.
 * <p>주소는 프로젝트 기준(/tests/...)으로 씁니다. new URL(`../${name}`, import.meta.url)로 쓰면
 * Vite가 바로 아래 파일 목록으로 바꿔 버려서 dup/ 같은 하위 폴더 사진을 못 찾습니다.
 *
 * @param {string} name upload-edge.json의 file 값. 예: '01_full-exif.jpg'
 * @returns {Promise<File>}
 * <p>
 * <p>name: 넘긴 이름 그대로. 예: '01_full-exif.jpg'
 * <p>size: 원본 바이트 수. 예: 401531
 * <p>type: ''. new File은 blob의 형식을 물려받지 않습니다.
 * <p>lastModified: File을 만든 시각(밀리초)
 */
async function loadFixture(name) {
  const res = await fetch(`/tests/fixtures/upload-edge/${name}`);

  // 없는 파일도 Vite가 index.html을 200으로 돌려줍니다. 그대로 두면 readable: false를
  // 기대하는 케이스(11, 16번)는 파일이 없어도 통과하므로 여기서 막습니다.
  if (res.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`fixture가 없어요: ${name}`);
  }
  /*
  res = {
    ok: true,                // status가 200~299면 true
    status: 200,
    statusText: 'OK',
    url: 'http://localhost:63315/tests/fixtures/upload-edge/01_full-exif.jpg',
    headers: Headers {       // res.headers.get('content-type') → 'image/jpeg'
      'content-type': 'image/jpeg',
      'content-length': '401531',
      ...
    },
    body: ReadableStream,    // 파일 내용. 아직 다 안 받았을 수 있음
    bodyUsed: false,         // 본문을 이미 꺼냈는지

    // 본문을 꺼내는 메서드 (전부 Promise)
    blob(),
    arrayBuffer(),
    text(),
    json(),
    formData()
  }
  */
  const blob = await res.blob();
  return new File([blob], name);
}

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
