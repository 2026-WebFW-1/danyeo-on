import { readExif } from '@/utils/upload/readExif';
import { toDedupeKey } from '@/utils/upload/dedupeKey';

/**
 * <p>고른 원본을 한 장씩 읽어 촬영 정보를 모읍니다.(#22)
 * <p>줄이면 EXIF가 사라지므로 원본(useUploadStore의 files)으로 불러야 합니다.
 * <p>이미지는 열지 않습니다. 브라우저가 못 그리는 HEIC도 정보는 읽어서 photos에 들어갑니다.
 *
 * <p>exifr는 파일을 통째로 읽어서, 수백 장을 동시에 읽으면 메모리가 튑니다. 그래서 한 장씩 읽습니다.
 * <p>한 장을 못 읽어도 멈추지 않고 skipped에 넣은 뒤 다음 장으로 넘어갑니다.
 *
 * @param {File[]} files filterPhotoFiles가 남긴 사진
 * @param {{ onProgress?: (progress: { done: number, total: number }) => void }} [options]
 *   onProgress는 한 장을 읽을 때마다 불려요
 * @returns {Promise<{
 *   photos: import('@/types').ReadPhoto[],
 *   skipped: import('@/types').SkippedFile[],
 *   counts: { unreadable: number, noDate: number, noLocation: number },
 * }>}
 *   photos는 고른 순서대로예요. counts의 noDate·noLocation은 읽은 사진(photos) 중 개수예요
 */
export async function readPhotos(files, { onProgress } = {}) {
  const photos = [];
  const skipped = [];

  for (const [order, file] of files.entries()) {
    const { readable, ...info } = await readExif(file);

    if (readable) {
      photos.push({
        order,
        fileName: file.name,
        ...info,
        dedupeKey: toDedupeKey(file.name, info.takenAt),
      });
    } else {
      skipped.push({ fileName: file.name, reason: 'unreadable' });
    }

    onProgress?.({ done: order + 1, total: files.length });
  }

  return {
    photos,
    skipped,
    counts: {
      unreadable: skipped.length,
      noDate: photos.filter((photo) => photo.takenAt === null).length,
      noLocation: photos.filter((photo) => photo.lat === null).length,
    },
  };
}
