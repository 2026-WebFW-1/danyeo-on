import { SORT_THUMB_COUNT } from '@/constants/photoSort';
import { formatDateRange } from '@/utils/formatDateRange';
import { formatNo } from '@/utils/formatNo';
import { toLocalDate } from '@/utils/localDate';

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
 * @property {SortCityChip[]} cities 경유 지점과 사진을 모두 뺀 지점은 빼요
 * @property {import('@/types').PhotoRef[]} thumbs 앞에서부터 SORT_THUMB_COUNT장
 * @property {number} photoCount 경유 지점의 사진은 빼요(selectTripStats와 같은 기준)
 * @property {import('@/types').PhotoRef[]} photos ⋯로 펼쳐 뺄 수 있는 사진. 경유 지점의 사진도 들어 있어요
 * @property {string | null} renameAnchorId 지금 이름을 정한 rename의 기준 사진. 자동 이름이면 null
 */

/**
 * 07 제외한 사진 탭의 사진 하나예요.
 *
 * @typedef {object} ExcludedPhoto
 * @property {string} id 사진 ID
 * @property {string | null} fileKey 사진을 못 받았거나 없는 사진이면 null(회색 칸)
 * @property {string | null} takenAt 현지 촬영 시각. 모르면 null
 * @property {string[]} correctionIds 이 사진을 뺀 exclude 보정. 같은 사진에 둘 이상일 수 있어요(BE #8)
 */

const isExclude = (correction) => correction.type === 'exclude';

// 날짜 없는 사진 묶음의 열쇠예요.
const NO_DATE_KEY = 'none';

/**
 * 지금 빠져 있는 사진 ID예요.
 *
 * 보정을 저장하면 Journey를 다시 계산하는 데 20초쯤 걸려서, 그동안 journey.excluded는 앞 값이에요.
 * 보정을 다 불러왔으면 보정 목록이 기준이에요. 뺀 사진은 바로 들어가고, 복구한 사진은 바로 빠져요.
 * 불러오기 전(null)에는 Journey의 값을 써요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Correction[] | null} corrections 다 불러오기 전이면 null
 * @returns {Set<string>}
 */
export function selectExcludedIds(journey, corrections) {
  if (!corrections) return new Set(journey?.excluded ?? []);
  return new Set(corrections.filter(isExclude).map((correction) => correction.photoId));
}

/**
 * 07a 여행 표의 줄을 만들어요. journey가 없으면 빈 배열이에요.
 *
 * 이름과 뺀 사진은 보정 목록으로 덮어 보여 줘요. buildJourney와 같은 규칙(그 여행 사진에 걸린 마지막 rename,
 * 뺀 사진은 지점에서 빠짐)이라 계산이 끝나 Journey가 바뀌어도 같은 값이에요.
 * 복구한 사진은 어느 지점에 들어갈지 계산해야 알 수 있어서, 계산이 끝난 뒤에 돌아와요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Correction[]} corrections
 * @param {import('@/types').Photo[]} photos 썸네일의 fileKey를 찾을 사진 전부. 못 받았으면 빈 배열(회색 칸)
 * @param {Set<string>} excludedIds selectExcludedIds의 값
 * @returns {SortTripRow[]}
 */
export function selectSortTrips(journey, corrections, photos, excludedIds) {
  if (!journey) return [];

  const stopById = new Map(journey.stops.map((stop) => [stop.id, stop]));
  const fileKeyById = new Map(photos.map((photo) => [photo.id, photo.fileKey]));
  const renames = corrections.filter((correction) => correction.type === 'rename');
  const toRef = (id) => ({ id, fileKey: fileKeyById.get(id) ?? null });
  const keptPhotoIds = (stop) => stop.photoIds.filter((id) => !excludedIds.has(id));

  const trips = journey.trips.map((trip) => {
    const tripStops = trip.stopIds.map((id) => stopById.get(id)).filter(Boolean);
    // buildJourney의 nameTrip처럼 경유 지점의 사진도 이 여행의 사진으로 봐요.
    const tripPhotoIds = new Set(tripStops.flatMap((stop) => stop.photoIds));
    const rename = renames.findLast((correction) => tripPhotoIds.has(correction.anchorPhotoId));
    const cityStops = tripStops.filter((stop) => !stop.transit && keptPhotoIds(stop).length > 0);
    const cityPhotoIds = cityStops.flatMap(keptPhotoIds);

    return {
      id: trip.id,
      name: rename?.name ?? trip.name,
      renameAnchorId: rename?.anchorPhotoId ?? null,
      dateRange: formatDateRange(trip.from, trip.to),
      cities: cityStops.map((stop) => ({ id: stop.id, city: stop.city, days: stop.days })),
      thumbs: cityPhotoIds.slice(0, SORT_THUMB_COUNT).map(toRef),
      photoCount: cityPhotoIds.length,
      photos: tripStops.flatMap(keptPhotoIds).map(toRef),
    };
  });

  // 사진을 모두 뺀 여행은 다시 계산하면 사라져요. 번호도 그 여행을 빼고 다시 매겨요.
  return trips
    .filter((trip) => trip.photos.length > 0)
    .map((trip, index) => ({ ...trip, no: formatNo(index + 1) }));
}

/**
 * 07a에서 사진 하나를 뺄 때 저장할 보정이에요.
 *
 * 빼는 사진이 지금 이름을 정한 rename의 기준 사진이면, 남은 사진을 기준으로 같은 이름을 먼저 다시 걸어요.
 * buildJourney는 뺀 사진을 먼저 지우고 남은 사진에서 rename의 기준 사진을 찾아서, 그대로 빼면 다시 계산할 때 이름이
 * 자동 이름으로 돌아가요. 이름을 먼저 저장해야 빼기가 실패해도 이름이 남아요(useCorrectionStore.addMany가 차례로 보내요).
 *
 * @param {SortTripRow} trip
 * @param {string} photoId
 * @returns {import('@/types').CorrectionInput[]}
 */
export function buildTripExcludeInputs(trip, photoId) {
  const exclude = { type: 'exclude', photoId };
  if (trip.renameAnchorId !== photoId) return [exclude];

  const nextAnchor = trip.photos.find((photo) => photo.id !== photoId);
  // 마지막 사진이면 여행이 사라져서 이름을 옮길 곳이 없어요.
  if (!nextAnchor) return [exclude];
  return [{ type: 'rename', anchorPhotoId: nextAnchor.id, name: trip.name }, exclude];
}

/**
 * 07a에서 여행 이름을 바꿀 때 저장할 보정이에요. 기준 사진은 그 여행에 남아 있는 첫 사진이에요.
 *
 * 여행 ID(첫 사진)는 그 사진을 뺀 뒤에도 다시 계산이 끝날 때까지 그대로라, 여행 ID에 걸면 buildJourney가 뺀 사진을
 * 먼저 지운 뒤 rename을 찾지 못해 이름이 자동 이름으로 돌아가요.
 *
 * @param {SortTripRow} trip
 * @param {string} name
 * @returns {import('@/types').CorrectionInput}
 */
export function buildTripRenameInput(trip, name) {
  // 사진이 하나도 없는 여행은 표에 없어서(selectSortTrips) photos[0]은 늘 있어요.
  return { type: 'rename', anchorPhotoId: trip.photos[0].id, name };
}

/**
 * 07 탭마다 붙는 개수예요. journey가 없으면 모두 0이에요. 뺀 사진은 위치 확인 필요에서 빠져요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {SortTripRow[]} trips selectSortTrips의 값. 사진을 모두 뺀 여행은 이미 빠져 있어요
 * @param {Set<string>} excludedIds selectExcludedIds의 값
 * @returns {{ trips: number, unlocated: number, excluded: number }}
 */
export function selectSortCounts(journey, trips, excludedIds) {
  if (!journey) return { trips: 0, unlocated: 0, excluded: 0 };

  return {
    trips: trips.length,
    unlocated: journey.unlocated.filter((id) => !excludedIds.has(id)).length,
    excluded: excludedIds.size,
  };
}

/**
 * 제외한 사진 탭의 목록이에요. 최근에 뺀 사진이 앞이에요.
 * 같은 사진의 exclude가 여럿이면 하나로 묶어, [복구]가 모두 지우게 해요(BE #8).
 *
 * @param {import('@/types').Correction[]} corrections
 * @param {import('@/types').Photo[]} photos
 * @returns {ExcludedPhoto[]}
 */
export function selectExcludedPhotos(corrections, photos) {
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  /** @type {Map<string, ExcludedPhoto>} */
  const byPhotoId = new Map();

  // 뒤에서부터 보면 마지막으로 뺀 순서가 돼요.
  for (const correction of corrections.toReversed()) {
    if (!isExclude(correction)) continue;
    const existing = byPhotoId.get(correction.photoId);
    if (existing) {
      existing.correctionIds.push(correction.id);
      continue;
    }
    const photo = photoById.get(correction.photoId);
    byPhotoId.set(correction.photoId, {
      id: correction.photoId,
      fileKey: photo?.fileKey ?? null,
      takenAt: photo?.takenAt ?? null,
      correctionIds: [correction.id],
    });
  }

  return [...byPhotoId.values()];
}

/**
 * 07b 위치 확인 필요의 날짜 묶음 하나예요.
 *
 * @typedef {object} UnlocatedGroup
 * @property {string} key 'YYYY-MM-DD' 또는 날짜가 없으면 'none'
 * @property {string | null} date 예: '2025.01.04'. 날짜가 없으면 null
 * @property {import('@/types').PhotoRef[]} photos 찍은 순서
 */

/**
 * 위치가 없어 지점에 못 넣은 사진(journey.unlocated)을 찍은 날짜별로 묶어요.
 * 날짜 순서이고, 날짜가 없는 사진은 맨 뒤 "날짜 없음" 묶음이에요. 뺀 사진은 바로 빠져요(selectExcludedIds).
 * 사진을 못 받았으면 날짜를 알 수 없어서 모두 날짜 없음 묶음에 들어가요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Photo[]} photos
 * @param {Set<string>} excludedIds
 * @returns {UnlocatedGroup[]}
 */
export function selectUnlocatedGroups(journey, photos, excludedIds) {
  if (!journey) return [];

  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  /** @type {Map<string, { takenAt: string | null, ref: import('@/types').PhotoRef }[]>} */
  const byDate = new Map();

  for (const id of journey.unlocated) {
    if (excludedIds.has(id)) continue;
    const photo = photoById.get(id);
    const takenAt = photo?.takenAt ?? null;
    const key = takenAt ? toLocalDate(takenAt) : NO_DATE_KEY;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push({ takenAt, ref: { id, fileKey: photo?.fileKey ?? null } });
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => {
      if (a === NO_DATE_KEY) return 1;
      if (b === NO_DATE_KEY) return -1;
      return a.localeCompare(b);
    })
    .map(([key, items]) => ({
      key,
      date: key === NO_DATE_KEY ? null : formatDateRange(key, key),
      // takenAt은 시간대 없는 현지 시각이라 글자 순서가 곧 시각 순서예요.
      photos: items
        .toSorted((a, b) => (a.takenAt ?? '').localeCompare(b.takenAt ?? ''))
        .map((item) => item.ref),
    }));
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
