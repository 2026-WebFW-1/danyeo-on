// 편집 앱이 원본 이름 뒤에 붙이는 표시예요. 진짜 분류가 붙으면 이 파일째 바꿔 끼워요.
// -edited, _편집 이 걸리도록 /i를 통해 대소문자 무시
const EDITED_PATTERN = /(-edited|_편집)/i;
// 날짜(20250712)나 번호(IMG_0213)가 없으면 줄 어디에 둘지 이름으로 알 수 없어요.
const DIGIT_PATTERN = /\d/;
// 확장자의 숫자(.mp4 등)를 날짜·번호로 세지 않으려고 떼어 내요.
const EXTENSION_PATTERN = /\.[^.]+$/;

/**
 * 사진을 그냥 넣을지('auto'), 천천히 보여줄지('show'), 끝에서 물어볼지('ask') 임시로 정해요.
 * 자리를 못 찾는 게 더 급해서, 편집본이어도 이름에 숫자가 없으면 'ask'예요.
 * @param {import('@/types').PilePhoto} photo
 * @returns {'auto' | 'show' | 'ask'}
 */
export function getPassKind(photo) {
  const name = photo.filename.replace(EXTENSION_PATTERN, '');
  if (!DIGIT_PATTERN.test(name)) return 'ask';
  return EDITED_PATTERN.test(name) ? 'show' : 'auto';
}
