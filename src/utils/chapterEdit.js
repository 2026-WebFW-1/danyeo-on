import { calcDaysBetween, toLocalDate } from '@/utils/localDate';

// 촬영 시각은 '2025-07-12T13:10:15'처럼 현지 시각이고 시간대가 없어요. 앞부분을 그대로 잘라 써요.
const TIME_START = 'YYYY-MM-DDT'.length;
const TIME_END = 'YYYY-MM-DDTHH:mm'.length;

function compareTakenAt(a, b) {
  if (a.takenAt < b.takenAt) return -1;
  return a.takenAt > b.takenAt ? 1 : 0;
}

/**
 * 그날(현지 날짜) 찍은 사진만 촬영 순서로 골라요. 촬영 시각이 없는 사진은 어느 날인지 몰라서 빼요.
 *
 * @param {import('@/types').Photo[]} photos
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @returns {import('@/types').Photo[]}
 */
export function selectPhotosOfDate(photos, date) {
  return photos
    .filter((photo) => photo.takenAt && toLocalDate(photo.takenAt) === date)
    .toSorted(compareTakenAt);
}

/**
 * 챕터 지점의 첫날을 Day 1로 센 날짜 번호예요. 지점이 시작하기 전 날짜면 null이에요.
 * 지점의 from은 현지 시간대가 붙은 시각이라, 날짜 부분을 잘라서 현지 날짜끼리 세요.
 *
 * @param {Pick<import('@/types').Stop, 'from'>} stop
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @returns {number | null}
 */
export function getDayNumber(stop, date) {
  const dayNumber = calcDaysBetween(stop.from, date) + 1;
  return dayNumber >= 1 ? dayNumber : null;
}

/**
 * 글을 고칠 때 왼쪽에 보여 줄 사진을 골라요.
 * 글에 붙은 사진(photoIds) 중 이 지점에 있는 첫 장이고, 없으면 그날 찍은 사진의 첫 장이에요.
 * 둘 다 없으면 null이라서 회색 칸으로 그려요.
 *
 * @param {Pick<import('@/types').Post, 'photoIds'> | null | undefined} post 고치는 글. 아직 없는 글이면 비워 둬요
 * @param {import('@/types').Photo[]} photos 지점의 사진
 * @param {string} date 현지 날짜 YYYY-MM-DD
 * @returns {import('@/types').Photo | null}
 */
export function pickEditPhoto(post, photos, date) {
  const attached = (post?.photoIds ?? [])
    .map((id) => photos.find((photo) => photo.id === id))
    .find((photo) => photo !== undefined);

  return attached ?? selectPhotosOfDate(photos, date)[0] ?? null;
}

/**
 * 사진 아래에 붙는 한 줄 설명이에요. 파일 이름 · 촬영 날짜와 시각 · 도시 이름 순서이고, 없는 것은 빼요.
 * 피그마 14a의 "IMG_0176.JPG · 2025.07.12 13:10 · 카필라노"에서 세부 장소(카필라노)는 데이터에 없어서 도시 이름을 써요.
 *
 * @param {Pick<import('@/types').Photo, 'fileName' | 'takenAt'>} photo
 * @param {string} city 지점의 도시 이름
 * @returns {string} 예: 'IMG_0188.JPG · 2025.07.12 13:10 · 밴쿠버'
 */
export function formatPhotoCaption(photo, city) {
  const takenAt = photo.takenAt
    ? `${toLocalDate(photo.takenAt).replaceAll('-', '.')} ${photo.takenAt.slice(TIME_START, TIME_END)}`
    : null;

  return [photo.fileName, takenAt, city].filter(Boolean).join(' · ');
}
