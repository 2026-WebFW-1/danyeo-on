// 각 변 기준 px
const FULL_EDGE = 2048;
const THUMB_EDGE = 400;
const QUALITY = 0.8;

/**
 * <p>보기용(긴 변 2048px) 한 장만 만듭니다.
 * <p>썸네일은 고를 때 resizeThumbnail로 이미 만들어 두어서, 올릴 때 다시 만들지 않습니다(#26).
 *
 * <p>결과에는 EXIF가 남지 않으니, 촬영 정보는 그 전에 원본으로 읽어야 합니다.
 * @param {File} file
 * @returns {Promise<Blob | null>} 브라우저가 열지 못하는 파일(HEIC, 깨진 파일)은 null
 */
export async function resizeFull(file) {
  return withBitmap(file, (bitmap) => drawToBlob(bitmap, FULL_EDGE));
}

/**
 * <p>썸네일 한 장만 만듭니다.
 * <p>화면에 바로 보여 줄 때(#87 사진 쌓기)는 썸네일만 쓰는데, resizePhoto로 만들면
 * 2048px 보기용까지 만들고 버리게 됩니다. 사진 한 장에서 가장 오래 걸리는 일이라 나눴습니다.
 * @param {File} file
 * @returns {Promise<Blob | null>} 브라우저가 열지 못하는 파일(HEIC, 깨진 파일)은 null
 */
export async function resizeThumbnail(file) {
  return withBitmap(file, (bitmap) => drawToBlob(bitmap, THUMB_EDGE));
}

/**
 * <p>파일을 비트맵으로 풀어 draw에 넘기고, 다 쓰면 바로 해제합니다.
 * <p>resizePhoto와 resizeThumbnail이 여는 방법·실패 처리·해제를 같이 씁니다.
 * @template T
 * @param {File} file
 * @param {(bitmap: ImageBitmap) => Promise<T>} draw
 * @returns {Promise<T | null>} 열거나 그리다 실패하면 null
 */
async function withBitmap(file, draw) {
  let bitmap; // ImageBitmap (createImageBitmap을 await한 결과)

  try {
    // 브라우저 내장 함수: createImageBitmap을 사용합니다.
    // 이미지 데이터를 받아서 이미 디코딩된 비트맵인 ImageBitmap으로 바꿔줍니다.
    // * 디코딩: JPEG, PNG 같은 압축 파일을 픽셀 배열로 푸는 작업입니다.
    // from-image: EXIF의 회전 정보대로 세워서 읽습니다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }

  try {
    return await draw(bitmap);
  } catch {
    return null;
  } finally {
    // 디코딩 된 픽셀을 메모리에 들고 있게됩니다. 4000 x 3000 사진은
    // 4byte x 픽셀수 = 약 48MB이므로 다 쓰고나면 바로 해제하는 게 좋습니다.
    bitmap.close();
  }
}

/**
 * <p>줄인 크기로 그린 다음, 결과를 새 이미지 파일인 Blob으로 만들어냅니다.
 *
 * @param {ImageBitmap} bitmap
 * @param {number} maxEdge
 * @returns {Promise<Blob>}
 */
async function drawToBlob(bitmap, maxEdge) {
  // 배율이 1을 넘지 않도록 설계합니다.
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  // appendChild는 하지 않으므로 화면에는 안보이는 메모리 도화지가 됩니다.
  const canvas = document.createElement('canvas');

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  // 보간(interpolation): "low"(default) | "medium" | "high";
  // 줄일때만 사용됩니다.
  context.imageSmoothingQuality = 'high';

  // resize
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvasToBlob(canvas, await getImageType());
}

let imageTypePromise = null;

/**
 * <p>WebP를 만들 수 있는 브라우저인지 처음 한 번만 확인합니다.
 * <p>WebP를 못 만드는 브라우저(Safari)는 PNG를 돌려줘서 용량이 커지므로 JPEG로 대신합니다.
 * 사진마다 WebP를 먼저 만들어 보면 Safari에서 장마다 두 번 인코딩하게 됩니다(PR #88 리뷰).
 * @returns {Promise<'image/webp' | 'image/jpeg'>}
 */
function getImageType() {
  imageTypePromise ??= canvasToBlob(document.createElement('canvas'), 'image/webp').then(
    (blob) => (blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg'),
    () => 'image/jpeg',
  );
  return imageTypePromise;
}

/**
 * <p>캔버스 픽셀을 WebP로 압축해서 새 파일 데이터를 얻습니다.
 * <p>해당 과정에서 인코딩이 일어납니다.
 *
 * <p>*인코딩: 픽셀을 압축 파일 형식으로 묶는 과정이며 이 과정에서 EXIF데이터가 날아갑니다.
 * @param canvas
 * @param type
 * @returns {Promise<unknown>}
 */
function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요'))),
      type,
      QUALITY,
    );
  });
}
