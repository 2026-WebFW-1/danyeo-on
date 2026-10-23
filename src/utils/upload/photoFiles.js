/**
 * 사용자가 고른 파일을 사진 목록으로 만드는 함수 모음
 *
 * 책임: 파일 이름만 보고 사진을 거르며, 끌어다 놓은 폴더를 파일 목록으로 펼칩니다.(#51)
 *      사진이 실제로 열리는지, 촬영 정보가 있는지는 보지 않습니다. > #22, readExif 몫
 *
 * 호출: PickStep의 input change와 drop 핸들러
 *
 * 생각할 것:
 *  - 확장자만 jpg인 깨진 파일(fixtures/16_not-an-image.jpg)은 거르지 못하며 다음 단계에서 걸러집니다.
 */

import { PHOTO_EXTENSIONS } from '@/constants/upload/upload';

/**
 * 사진으로 받을 파일인지 이름으로 봅니다.
 * macOS가 USB 및 외장 디스크에 남기는 `._IMG_0001.jpg` 같은 숨김 파일은 확장자가 같아도 사진이 아니라서 뺍니다.
 * @param {File} file
 * @returns {boolean}
 */
export function isPhotoFile(file) {
  const name = file.name;
  const dotIndex = name.lastIndexOf('.');
  if (name.startsWith('.') || dotIndex === -1) return false;

  return PHOTO_EXTENSIONS.includes(name.slice(dotIndex + 1).toLowerCase());
}

/**
 * 고른 파일 중 사진만 남깁니다.
 * 이때 순서는 그대로입니다.
 * @param {Iterable<File>} files input.files(FileList)나 File 배열
 * @returns {File[]}
 */
export function filterPhotoFiles(files) {
  return Array.from(files).filter(isPhotoFile);
}
