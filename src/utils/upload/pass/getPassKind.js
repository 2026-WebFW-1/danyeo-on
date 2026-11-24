// 편집 앱이 원본 이름 뒤에 붙이는 표시예요.
// -edited, _편집 이 걸리도록 /i를 통해 대소문자 무시
const EDITED_PATTERN = /(-edited|_편집)/i;

/**
 * 사진을 그냥 넣을지('auto'), 천천히 보여줄지('show'), 끝에서 물어볼지('ask') 정해요.
 * 촬영 시각이 없으면 여행 어디에 넣을지 알 수 없어서, 편집본이어도 'ask'예요.
 * 못 여는 파일(readable: false)도 'ask'예요. 이유가 달라서 묻는 문구는 PassAskCard가 나눠요.
 * 위치만 없는 사진은 앞뒤 사진의 지점에 들어가서 묻지 않아요(#173).
 * 편집본은 아직 파일 이름으로 가려요.
 * @param {import('@/types').PilePhoto} photo
 * @returns {'auto' | 'show' | 'ask'}
 */
export function getPassKind(photo) {
  if (photo.takenAt === null) return 'ask';
  return EDITED_PATTERN.test(photo.filename) ? 'show' : 'auto';
}
