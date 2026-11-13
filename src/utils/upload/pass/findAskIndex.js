import { getPassKind } from './getPassKind';

/**
 * 아직 답하지 않은 물어볼 사진('ask') 중 가장 앞 사진의 순서예요.
 * [나중에]도 답으로 쳐서, 답한 사진은 다시 묻지 않아요.
 * @param {import('@/types').PilePhoto[]} photos
 * @param {Record<string, 'exclude' | 'later'>} answers 사진 id별 답
 * @returns {number} 남은 질문이 없으면 -1
 */
export function findAskIndex(photos, answers) {
  return photos.findIndex((photo) => getPassKind(photo) === 'ask' && !(photo.id in answers));
}
