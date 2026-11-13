// 편집 앱이 원본 이름 뒤에 붙이는 표시예요. 진짜 분류가 붙으면 이 파일째 바꿔 끼워요.
// -edited, _편집 이 걸리도록 /i를 통해 대소문자 무시
const EDITED_PATTERN = /(-edited|_편집)/i;

/**
 * 사진을 그냥 넣을지('auto'), 천천히 보여줄지 ('show')임시로 정해요.
 * @param {import('@/types').PilePhoto} photo
 * @returns {'auto' | 'show'}
 */
export function getPassKind(photo) {
  return EDITED_PATTERN.test(photo.filename) ? 'show' : 'auto';
}
