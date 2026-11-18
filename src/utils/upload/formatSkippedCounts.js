import { SKIP_REASON_LABELS } from '@/constants/upload';

/**
 * 뺀 파일을 이유별 개수로 한 줄에 적습니다(U109). 예: '숨김 파일 2개 · 받지 않는 형식 1개'
 * 파일 이름을 다 늘어놓으면 폴더째 고를 때 수십 줄이 돼서 개수만 보여 줍니다.
 * @param {import('@/types').SkippedFile[]} skipped
 * @returns {string} 뺀 파일이 없으면 빈 문자열
 */
export function formatSkippedCounts(skipped) {
  return Object.entries(SKIP_REASON_LABELS)
    .map(([reason, label]) => ({
      label,
      count: skipped.filter((file) => file.reason === reason).length,
    }))
    .filter(({ count }) => count > 0)
    .map(({ label, count }) => `${label} ${count}개`)
    .join(' · ');
}
