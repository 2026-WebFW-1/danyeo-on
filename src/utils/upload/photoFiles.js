/**
 * 사용자가 고른 파일을 사진 목록으로 만드는 함수 모음
 *
 * 책임: 파일 이름만 보고 사진을 거르며, 끌어다 놓은 폴더를 파일 목록으로 펼칩니다.(#51)
 *      사진이 실제로 열리는지, 촬영 정보가 있는지는 보지 않습니다. > readPhotos 몫
 *
 * 호출: SelectPhotosStep의 input change와 drop 핸들러
 *
 * 생각할 것:
 *  - 확장자만 jpg인 깨진 파일(fixtures/16_not-an-image.jpg)은 거르지 못하며 다음 단계에서 걸러집니다.
 */

import { PHOTO_EXTENSIONS } from '@/constants/upload';

/**
 * 사진으로 받지 않을 파일이면 그 이유를 이름으로 봅니다.
 * macOS가 USB 및 외장 디스크에 남기는 `._IMG_0001.jpg` 같은 숨김 파일은 확장자가 같아도 사진이 아니라서 뺍니다.
 * @param {File} file
 * @returns {'hidden' | 'unsupported' | null} 사진으로 받으면 null
 */
export function skipReason(file) {
  const name = file.name;
  if (name.startsWith('.')) return 'hidden';

  const dotIndex = name.lastIndexOf('.');
  const extension = dotIndex === -1 ? '' : name.slice(dotIndex + 1).toLowerCase();
  return PHOTO_EXTENSIONS.includes(extension) ? null : 'unsupported';
}

/**
 * 고른 파일을 사진과 뺀 파일로 나눕니다. 둘 다 순서는 그대로입니다.
 * 뺀 파일은 readPhotos가 못 읽은 파일과 같은 모양이라, 화면은 이어 붙여 한 목록으로 보여 줄 수 있습니다.
 * @param {Iterable<File>} files input.files(FileList)나 File 배열
 * @returns {{ photos: File[], skipped: import('@/types').SkippedFile[] }}
 */
export function filterPhotoFiles(files) {
  const photos = [];
  const skipped = [];

  for (const file of files) {
    const reason = skipReason(file);
    if (reason) {
      skipped.push({ fileName: file.name, reason });
    } else {
      photos.push(file);
    }
  }

  return { photos, skipped };
}

/**
 * 파일 항목에서 File을 꺼냅니다.
 * file()은 콜백 방식이라 Promise로 감쌉니다.
 * @param {FileSystemFileEntry} fileEntry
 * @returns {Promise<File>}
 */
function readFile(fileEntry) {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

/**
 * 폴더 바로 안의 항목을 전부 꺼냅니다. 하위 폴더 안까지는 들어가지 않습니다.
 * readEntries는 한 번에 최대 100개라 빈 배열이 올 때까지 같은 reader로 다시 부릅니다.
 * @param {FileSystemDirectoryEntry} directoryEntry
 * @returns {Promise<FileSystemEntry[]>}
 */
async function readChildren(directoryEntry) {
  const reader = directoryEntry.createReader();
  const children = [];

  while (true) {
    const batch = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) {
      break;
    }
    children.push(...batch);
  }

  return children;
}

/**
 * 끌어다 놓은 항목(파일·폴더)을 파일 목록으로 펼칩니다. 폴더는 하위 폴더까지 내려갑니다.
 * 사진인지는 보지 않습니다. > filterPhotoFiles
 * @param {FileSystemEntry[]} entries drop 이벤트에서 webkitGetAsEntry()로 꺼낸 항목
 * @returns {Promise<File[]>}
 */
export async function filesFromEntries(entries) {
  const files = [];

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await readFile(entry);
      files.push(file);
    }

    if (entry.isDirectory) {
      const children = await readChildren(entry);
      const childFiles = await filesFromEntries(children);
      files.push(...childFiles);
    }
  }

  return files;
}
