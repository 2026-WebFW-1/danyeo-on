// 사진으로 받는 확장자.
// readExif(exifr)가 촬영 정보를 읽을 수 있는 형식만 받습니다. webp·gif처럼 못 읽는 형식은 날짜·위치가 없어서 뺐습니다.
// jfif·jpe는 Windows가 JPEG에 붙이는 다른 확장자입니다.
// heic·tif는 정보는 읽지만 브라우저가 못 그려서(heic는 Safari만) 썸네일이 회색 칸이 됩니다.
// 파일 형식(type)은 Windows에서 HEIC가 빈 문자열로 와서 이름으로 거르도록 합니다.
export const PHOTO_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jfif',
  'jpe',
  'png',
  'heic',
  'heif',
  'avif',
  'tif',
  'tiff',
];

// [사진 고르기] input의 accept.
// 확장자와 형식을 같이 적어야 휴대폰 선택기가 HEIC도 보여줍니다.
export const PHOTO_ACCEPT = [
  ...PHOTO_EXTENSIONS.map((ext) => `.${ext}`),
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
].join(',');

// 이미지를 동시에 올리는 장수. 장마다 2048px 보기용을 디코딩해서 메모리를 쓰므로 3장으로 묶었습니다(#26).
export const IMAGE_UPLOAD_CONCURRENCY = 3;

// 올리기가 실패하면 이만큼(ms) 기다렸다가 다시 시도합니다. 두 번 더 해도 실패하면 실패로 셉니다.
export const IMAGE_UPLOAD_RETRY_DELAYS_MS = [1000, 3000];
