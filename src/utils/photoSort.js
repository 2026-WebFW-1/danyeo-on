import { SORT_THUMB_COUNT } from '@/constants/photoSort';
import { formatDateRange } from '@/utils/formatDateRange';
import { formatNo } from '@/utils/formatNo';

/**
 * 07a 여행 표의 도시 칩 하나예요.
 *
 * @typedef {object} SortCityChip
 * @property {string} id 지점 ID
 * @property {string} city 예: '방콕'
 * @property {number} days 머문 날 수
 */

/**
 * 07a 여행 표의 줄 하나예요.
 *
 * @typedef {object} SortTripRow
 * @property {string} id 여행 ID(그 여행 첫 사진의 ID)
 * @property {string} no 예: '02'
 * @property {string} name 마지막 이름 보정이 있으면 그 이름, 없으면 Journey의 이름
 * @property {string} dateRange 예: '2024.11.08 — 11.16'
 * @property {SortCityChip[]} cities 경유 지점은 빼요
 * @property {import('@/types').PhotoRef[]} thumbs 앞에서부터 SORT_THUMB_COUNT장
 * @property {number} photoCount 경유 지점의 사진은 빼요(selectTripStats와 같은 기준)
 */

/**
 * 07a 여행 표의 줄을 만들어요. journey가 없으면 빈 배열이에요.
 *
 * 이름은 보정 목록으로 덮어 보여 줘요. 보정을 저장한 뒤 Journey를 다시 계산하는 데 20초쯤 걸려서,
 * 그동안 Journey는 앞 이름이에요. buildJourney와 같은 규칙(그 여행 사진에 걸린 마지막 rename)이라
 * 계산이 끝나 Journey가 바뀌어도 같은 이름이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Correction[]} corrections
 * @param {import('@/types').Photo[]} photos 썸네일의 fileKey를 찾을 사진 전부. 못 받았으면 빈 배열(회색 칸)
 * @returns {SortTripRow[]}
 */
export function selectSortTrips(journey, corrections, photos) {
  if (!journey) return [];

  const stopById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const fileKeyById = new Map(photos.map((photo) => [photo.id, photo.fileKey]));
  const renames = corrections.filter((correction) => correction.type === 'rename');

  return journey.trips.map((trip, index) => {
    const tripStops = trip.stopIds.map((id) => stopById.get(id)).filter(Boolean);
    // buildJourney의 nameTrip처럼 경유 지점의 사진도 이 여행의 사진으로 봐요.
    const tripPhotoIds = new Set(tripStops.flatMap((stop) => stop.photoIds));
    const rename = renames.findLast((correction) => tripPhotoIds.has(correction.anchorPhotoId));
    const cityStops = tripStops.filter((stop) => !stop.transit);

    return {
      id: trip.id,
      no: formatNo(index + 1),
      name: rename?.name ?? trip.name,
      dateRange: formatDateRange(trip.from, trip.to),
      cities: cityStops.map((stop) => ({ id: stop.id, city: stop.city, days: stop.days })),
      thumbs: cityStops
        .flatMap((stop) => stop.photoIds)
        .slice(0, SORT_THUMB_COUNT)
        .map((id) => ({ id, fileKey: fileKeyById.get(id) ?? null })),
      photoCount: cityStops.reduce((sum, stop) => sum + stop.photoCount, 0),
    };
  });
}

/**
 * 07 탭마다 붙는 개수예요. journey가 없으면 모두 0이에요.
 * 뺀 사진은 보정 목록으로 덮어 세요(selectSortTrips의 이름과 같은 이유). 뺀 사진은 위치 확인 필요에서도 빠져요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Correction[]} corrections
 * @returns {{ trips: number, unlocated: number, excluded: number }}
 */
export function selectSortCounts(journey, corrections) {
  if (!journey) return { trips: 0, unlocated: 0, excluded: 0 };

  const excludedIds = new Set([
    ...journey.excluded,
    ...corrections
      .filter((correction) => correction.type === 'exclude')
      .map((correction) => correction.photoId),
  ]);

  return {
    trips: journey.trips.length,
    unlocated: journey.unlocated.filter((id) => !excludedIds.has(id)).length,
    excluded: excludedIds.size,
  };
}

/**
 * 07 요약 줄의 사진 수예요. 위치는 사진에 좌표가 있는지만 봐요.
 *
 * @param {import('@/types').Photo[]} photos
 * @returns {{ total: number, located: number, unlocated: number }}
 */
export function selectPhotoSummary(photos) {
  const located = photos.filter(
    (photo) => typeof photo.lat === 'number' && typeof photo.lng === 'number',
  ).length;
  return { total: photos.length, located, unlocated: photos.length - located };
}
