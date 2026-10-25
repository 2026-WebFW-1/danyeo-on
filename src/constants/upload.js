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
