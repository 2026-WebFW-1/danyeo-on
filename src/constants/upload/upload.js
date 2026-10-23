// 사진으로 받는 확장자.
// 파일 형식(type)은 Windows에서 HEIC가 빈 문자열로 와서 이름으로 거르도록 합니다.
export const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif'];

// [사진 고르기] input의 accept.
// 확장자와 형식을 같이 적어야 휴대폰 선택기가 HEIC도 보여줍니다.
export const PHOTO_ACCEPT = [
  ...PHOTO_EXTENSIONS.map((ext) => `.${ext}`),
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
].join(',');

// PHOTO_ACCEPT 결과:
// '.jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif'
