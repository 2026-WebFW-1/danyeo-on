import { toUtcDay } from '@/utils/localDate';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function isSameList(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * 태그를 저장할 모양으로 다듬어요. 앞뒤 공백과 앞의 #을 떼고, 빈 값과 같은 태그를 빼요.
 *
 * @param {string[]} tags
 * @returns {string[]} 예: ['#밴쿠버', '밴쿠버', ' 여름 '] → ['밴쿠버', '여름']
 */
export function normalizeTags(tags) {
  const cleaned = tags.map((tag) => tag.trim().replace(/^#+/, '').trim());
  return [...new Set(cleaned)].filter(Boolean);
}

/**
 * 저장된 글과 지금 입력이 다른지 봐요. 순서가 다른 목록은 다르다고 봐요.
 *
 * @param {Pick<import('@/types').Post, 'title' | 'body' | 'tags' | 'photoIds'>} saved
 * @param {Pick<import('@/types').Post, 'title' | 'body' | 'tags' | 'photoIds'>} current
 * @returns {boolean}
 */
export function isPostDirty(saved, current) {
  return (
    saved.title !== current.title ||
    saved.body !== current.body ||
    !isSameList(saved.tags, current.tags) ||
    !isSameList(saved.photoIds, current.photoIds)
  );
}

/**
 * 현지 날짜를 날짜 줄 모양으로 바꿔요. 요일은 UTC로 계산해서 PC 시간대가 달라도 밀리지 않아요.
 *
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @returns {string} 예: '2025.07.12 (토)'
 */
export function formatPostDate(date) {
  const weekday = WEEKDAYS[new Date(toUtcDay(date)).getUTCDay()];
  return `${date.replaceAll('-', '.')} (${weekday})`;
}
