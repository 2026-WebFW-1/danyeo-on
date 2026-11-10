/**
 * <p>(촬영 시각, 파일 이름)이 같으면 이미 올린 사진으로 봅니다. 저장(#24)도 같은 규칙을 씁니다.
 * <p>촬영 시각이 없는 사진끼리는 이름만 같아도 같은 사진입니다. 저장 쪽 BE 제약(unique nulls not distinct)이 그렇게 봐서 맞췄습니다.
 * 다른 폴더의 같은 이름 사진은 두 번째부터 저장되지 않지만, 같은 폴더를 다시 넣어도 두 벌이 되지 않습니다.
 * <p>이름만 바꿔 다시 받은 사진(IMG_0098 (1).JPG)은 다른 사진이 됩니다. 내용 비교는 하지 않습니다.
 * <p>촬영 시각은 형식이 정해져 있어 '|'가 들어가지 않으므로 앞에 둡니다. 그래야 이름에 '|'가 있어도 키가 겹치지 않습니다.
 *
 * @param {string} fileName
 * @param {string | null} takenAt
 * @returns {string} 예: '2024-11-24T08:30:49|IMG_0098.JPG', 촬영 시각이 없으면 '|IMG_0098.JPG'
 */
export function toDedupeKey(fileName, takenAt) {
  return `${takenAt ?? ''}|${fileName}`;
}
