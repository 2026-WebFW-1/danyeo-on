import { toUtcDay } from '@/utils/localDate';
import { calcDistanceKm } from '@/utils/distance';
import { legMode } from '@/utils/legMode';

// 지점·여행 규칙은 my-journey의 mock/reference-group.mjs와 같아서, seed를 넣으면 fixtures의 *.group.json과 같아요.
// fillByTime(#170)은 참고 구현에 없지만 seed에는 채울 사진이 없어서 결과가 같아요.
// 나누는 시각(split, #191)도 참고 구현에 없고, 넘기지 않으면 결과가 같아요.
// 잇는 구간(merge, #198)도 참고 구현에 없고, 넘기지 않으면 결과가 같아요.

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const SAME_PLACE_KM = 60;
const STOP_BREAK_MS = 21 * MS_PER_DAY;
const MAX_TRIP_GAP_MS = 14 * MS_PER_DAY;
const MAX_FILL_GAP_MS = 12 * MS_PER_HOUR;
const CHAPTER_MIN_DAYS = 14;
const DEFAULT_OFFSET = '+09:00';
const COORD_SCALE = 1e5;

/**
 * @typedef {object} RawStop
 * @property {number} lat 사진 좌표 평균, 반올림 전
 * @property {number} lng
 * @property {import('@/types').LocatedPhoto[]} photos 시각 순
 * @property {number} firstAt 첫 사진의 실제 시각(밀리초)
 * @property {number} lastAt
 * @property {{ from: RawStop, firstAt: number, lastAt: number }} [cut] 나누는 시각이 없었으면 from 지점에 이어졌을 지점이에요.
 *   firstAt · lastAt은 두 지점 사이에 있는 나누는 시각 중 처음과 마지막이에요
 */

/**
 * @typedef {object} StopEntry
 * @property {import('@/types').GroupStop} stop
 * @property {RawStop} raw
 * @property {import('@/types').Photo[]} filled fillByTime이 이 지점에 넣은 위치 없는 사진
 */

/**
 * @typedef {object} MergeSpan 이을 두 여행 사이를 덮는 시각 구간이에요. startAt < endAt
 * @property {number} startAt 앞 여행 사진의 실제 시각(밀리초)
 * @property {number} endAt 뒤 여행 사진의 실제 시각(밀리초)
 * @property {string[]} [photoIds] 제외를 반영한 양쪽 기준 사진
 */

/**
 * 끝점만 맞닿는 이웃 경계까지 합쳐지지 않게 양쪽을 엄격하게 비교해요.
 * @param {{startAt: number, endAt: number}} span
 * @param {number | null} left 앞 지점의 마지막 시각
 * @param {number} right 뒤 지점의 첫 시각
 * @returns {boolean}
 */
export function crossesMergeBoundary(span, left, right) {
  return left !== null && span.startAt < right && left < span.endAt;
}

const roundCoord = (value) => Math.round(value * COORD_SCALE) / COORD_SCALE;
const toTakenMs = (photo) => Date.parse(`${photo.takenAt}${photo.offset ?? DEFAULT_OFFSET}`);
const byTakenMs = (a, b) => toTakenMs(a) - toTakenMs(b);
const hasTime = (photo) => Boolean(photo.takenAt);
const isLocated = (photo) => hasTime(photo) && photo.lat !== null && photo.lng !== null;
const toPairs = (items) => items.slice(1).map((item, i) => [items[i], item]);

/**
 * @param {number[]} splitAts 나누는 시각(밀리초)
 * @param {number} after 앞 사진의 시각. 이 시각은 넣지 않아요
 * @param {number} until 뒤 사진의 시각. 이 시각은 넣어요(그 사진부터 새 여행)
 * @returns {number[]} 두 시각 사이에 있는 나누는 시각
 */
const findSplitsBetween = (splitAts, after, until) =>
  splitAts.filter((at) => after < at && at <= until);

/**
 * 자정 무렵 시간대를 넘나들면 현지 날짜가 촬영 순서와 거꾸로일 수 있어서, 처음·끝 사진이 아니라 가장 이른·늦은 날짜로 세요.
 *
 * @param {string[]} takenAts 시간대 없는 현지 시각
 * @returns {number} 첫날과 마지막 날을 모두 센 날 수
 */
function countDays(takenAts) {
  const utcDays = takenAts.map(toUtcDay);
  return (Math.max(...utcDays) - Math.min(...utcDays)) / MS_PER_DAY + 1;
}

/**
 * 날짜변경선 양쪽(179.9와 -179.9)을 짧은 쪽으로 평균 내려고 경도를 -180 이상 180 미만으로 되돌려요.
 * 나머지 연산 대신 조건으로 돌려서, 범위 안의 값은 소수점까지 그대로예요.
 *
 * @param {number} lng -360 ~ 360
 * @returns {number}
 */
function wrapLng(lng) {
  if (lng >= 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
}

/**
 * 마지막 지점과만 비교해서, 토론토 → 나이아가라 → 토론토면 토론토 지점이 둘 생겨요.
 * 같은 지점이어도 사이에 나누는 시각이 있으면 새 지점을 만들어요.
 *
 * @param {import('@/types').LocatedPhoto[]} photos 시각 순
 * @param {number[]} splitAts 나누는 시각(밀리초)
 * @returns {RawStop[]}
 */
function buildStops(photos, splitAts) {
  const stops = [];
  for (const photo of photos) {
    const at = toTakenMs(photo);
    const current = stops.at(-1);
    const isSame = current && isSameStop(current, photo, at);
    const cutAts = isSame ? findSplitsBetween(splitAts, current.lastAt, at) : [];
    if (isSame && cutAts.length === 0) {
      addToStop(current, photo, at);
      continue;
    }

    const stop = { lat: photo.lat, lng: photo.lng, photos: [photo], firstAt: at, lastAt: at };
    if (cutAts.length > 0) {
      stop.cut = { from: current, firstAt: Math.min(...cutAts), lastAt: Math.max(...cutAts) };
    }
    stops.push(stop);
  }
  return stops;
}

/**
 * @param {RawStop} stop
 * @param {import('@/types').LocatedPhoto} photo
 * @param {number} at photo의 실제 시각(밀리초)
 * @returns {boolean}
 */
function isSameStop(stop, photo, at) {
  const isNearby = calcDistanceKm(stop, photo) <= SAME_PLACE_KM;
  const isSoonAfter = at - stop.lastAt < STOP_BREAK_MS;
  return isNearby && isSoonAfter;
}

/**
 * @param {RawStop} stop 사진을 넣고 중심을 사진 좌표 평균으로 옮겨요
 * @param {import('@/types').LocatedPhoto} photo
 * @param {number} at photo의 실제 시각(밀리초)
 */
function addToStop(stop, photo, at) {
  stop.photos.push(photo);
  const count = stop.photos.length;
  stop.lat += (photo.lat - stop.lat) / count;
  stop.lng = wrapLng(stop.lng + wrapLng(photo.lng - stop.lng) / count);
  stop.lastAt = at;
}

/**
 * 위치 없는 사진을 앞뒤로 찍은 위치 있는 사진의 지점에 넣어요.
 * 앞뒤가 다른 지점이면 이동 중에 찍었을 수 있어서 넣지 않아요.
 * 한 지점이 나누는 시각으로 갈라졌으면, 그 시각 앞은 앞 지점에, 그 시각부터는 뒤 지점에 넣어요.
 * 그 사이를 두 번 이상 나눴으면 나누는 시각 사이의 사진은 어느 여행에도 넣지 않아요. 위치 없는 사진만으로는 여행이 될 수 없어서예요.
 *
 * @param {RawStop[]} stops
 * @param {import('@/types').LocatedPhoto[]} located buildStops에 넣은 사진, 시각 순
 * @param {import('@/types').Photo[]} photos 시각만 있고 위치가 없는 사진
 * @returns {Map<RawStop, import('@/types').Photo[]>} 받은 순서 그대로
 */
function fillByTime(stops, located, photos) {
  const locatedAts = located.map(toTakenMs);
  const stopOf = new Map(stops.flatMap((stop) => stop.photos.map((photo) => [photo, stop])));

  const findStopAround = (at) => {
    // 위치 없는 사진이 수천 장일 수 있어서, 사진마다 located 전체를 훑지 않고 이진 탐색해요.
    // 같은 시각에 찍은 사진이 있으면 앞뒤가 같은 사진일 수 있어요.
    const prevIndex = findFirstIndex(locatedAts, (t) => t > at) - 1;
    const nextIndex = findFirstIndex(locatedAts, (t) => t >= at);
    const prevPhoto = located[prevIndex];
    const nextPhoto = located[nextIndex];
    if (!prevPhoto || !nextPhoto) return null;

    const isNear =
      at - locatedAts[prevIndex] <= MAX_FILL_GAP_MS &&
      locatedAts[nextIndex] - at <= MAX_FILL_GAP_MS;
    if (!isNear) return null;

    const prevStop = stopOf.get(prevPhoto);
    const nextStop = stopOf.get(nextPhoto);
    if (prevStop === nextStop) return prevStop;
    if (nextStop.cut?.from !== prevStop) return null;
    if (at < nextStop.cut.firstAt) return prevStop;
    if (at >= nextStop.cut.lastAt) return nextStop;
    return null;
  };

  const filledByStop = new Map();
  for (const photo of photos) {
    const stop = findStopAround(toTakenMs(photo));
    if (!stop) continue;
    if (!filledByStop.has(stop)) filledByStop.set(stop, []);
    filledByStop.get(stop).push(photo);
  }
  return filledByStop;
}

/**
 * @param {number[]} sorted 오름차순
 * @param {(value: number) => boolean} test 앞쪽은 false, 뒤쪽은 true가 되는 조건
 * @returns {number} test를 처음 만족하는 위치. 없으면 sorted.length
 */
function findFirstIndex(sorted, test) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (test(sorted[mid])) high = mid;
    else low = mid + 1;
  }
  return low;
}

/**
 * 지역이 하나뿐이면 어디가 집이고 어디가 여행지인지 가를 수 없어서 null이에요.
 *
 * @param {RawStop[]} stops
 * @returns {{ lat: number, lng: number } | null} 사진이 가장 많은 지역
 */
function findHome(stops) {
  const regions = groupIntoRegions(stops);
  if (regions.length <= 1) return null;

  const top = regions.reduce((best, r) => (r.photoCount > best.photoCount ? r : best));
  return { lat: roundCoord(top.lat), lng: roundCoord(top.lng) };
}

/**
 * @param {RawStop[]} stops
 * @returns {{ lat: number, lng: number, photoCount: number }[]} 지점마다 처음 만난 60km 지역에 모아요
 */
function groupIntoRegions(stops) {
  const regions = [];
  for (const stop of stops) {
    const region = regions.find((r) => calcDistanceKm(r, stop) <= SAME_PLACE_KM);
    if (region) region.photoCount += stop.photos.length;
    else regions.push({ lat: stop.lat, lng: stop.lng, photoCount: stop.photos.length });
  }
  return regions;
}

/**
 * @param {RawStop} raw
 * @param {{ lat: number, lng: number } | null} home
 * @param {import('@/types').Photo[]} filledPhotos fillByTime이 이 지점에 넣은 사진
 * @returns {import('@/types').GroupStop}
 */
function toGroupStop(raw, home, filledPhotos) {
  const first = raw.photos[0];
  // 나누는 시각 뒤의 위치 없는 사진은 지점의 첫 위치 있는 사진보다 앞일 수 있어서, 넣은 사진까지 세요.
  const days = countDays([...raw.photos, ...filledPhotos].map((photo) => photo.takenAt));
  const isHome = home !== null && calcDistanceKm(home, raw) <= SAME_PLACE_KM;
  // 안정 정렬이라 같은 시각이면 위치 있는 사진이 앞에 남아서, photoIds[0]이 지점 ID와 같아요.
  const photoIds = [...raw.photos, ...filledPhotos].toSorted(byTakenMs).map((photo) => photo.id);

  return {
    id: first.id,
    lat: roundCoord(raw.lat),
    lng: roundCoord(raw.lng),
    offset: first.offset,
    from: first.takenAt,
    to: raw.photos.at(-1).takenAt,
    days,
    photoIds,
    isHome,
    chapter: !isHome && days >= CHAPTER_MIN_DAYS,
  };
}

/**
 * @param {StopEntry[]} entries 시각 순
 * @param {number[]} splitAts 나누는 시각(밀리초)
 * @param {MergeSpan[]} mergeSpans 이을 시각 구간
 * @returns {import('@/types').GroupTrip[]}
 */
function buildTrips(entries, splitAts, mergeSpans) {
  // 집이나 위치 미확인으로 바뀐 기준 사진도 다른 여행의 경계를 잇지 않게 해요.
  if (!mergeSpans.length) return splitIntoRuns(entries, splitAts, []).map(toTrip);
  const awayPhotoIds = new Set(
    entries.filter((entry) => !entry.stop.isHome).flatMap((entry) => entry.stop.photoIds),
  );
  const activeSpans = mergeSpans.filter(
    (span) => !span.photoIds || span.photoIds.every((id) => awayPhotoIds.has(id)),
  );
  return splitIntoRuns(entries, splitAts, activeSpans).map(toTrip);
}

/**
 * @param {StopEntry[]} entries
 * @param {number[]} splitAts 나누는 시각(밀리초)
 * @param {MergeSpan[]} mergeSpans 이을 시각 구간
 * @returns {StopEntry[][]} 집 지점이 끼거나, 지점 사이가 14일 넘게 비거나, 사이에 나누는 시각이 있으면 끊은 묶음.
 *   집이나 14일 공백으로 끊길 자리라도 잇는 구간이 걸치면 이어요. 이어도 집 지점은 묶음에 넣지 않아요.
 *   나누는 시각이 있으면 잇는 구간보다 나누기가 이겨요
 */
function splitIntoRuns(entries, splitAts, mergeSpans) {
  const runs = [];
  let current = null;
  // 집 지점은 묶음에 넣지 않아서, 앞 여행이 끝난 시각은 집이 아닌 앞 지점의 마지막 시각으로 봐요.
  let prevAwayLastAt = null;
  let hasHomeBetween = false;

  for (const entry of entries) {
    if (entry.stop.isHome) {
      hasHomeBetween = true;
      continue;
    }

    const { firstAt, lastAt } = entry.raw;
    const isSplit = findSplitsBetween(splitAts, prevAwayLastAt, firstAt).length > 0;
    const isApart = hasHomeBetween || firstAt - prevAwayLastAt > MAX_TRIP_GAP_MS;
    // 기준 사진이 위치 없는 사진이면 지점 시각과 조금 어긋나서, 사이에 들어 있는지 대신 겹치는지로 봐요.
    const isMerged = mergeSpans.some((span) => crossesMergeBoundary(span, prevAwayLastAt, firstAt));
    if (!current || isSplit || (isApart && !isMerged)) {
      current = [];
      runs.push(current);
    }
    current.push(entry);
    prevAwayLastAt = lastAt;
    hasHomeBetween = false;
  }
  return runs;
}

/**
 * @param {StopEntry[]} run
 * @returns {import('@/types').GroupTrip}
 */
function toTrip(run) {
  const stops = run.map((entry) => entry.stop);
  return {
    id: stops[0].id,
    stopIds: stops.map((stop) => stop.id),
    from: stops[0].from,
    to: stops.at(-1).to,
    days: countDays(
      run.flatMap((entry) => [...entry.raw.photos, ...entry.filled].map((photo) => photo.takenAt)),
    ),
    legs: toPairs(stops).map(([from, to]) => toLeg(from, to)),
  };
}

/**
 * 참고 구현과 같게, 거리는 반올림한 지점 좌표로 재고 이동 수단은 반올림 전 km로 정해요.
 *
 * @param {import('@/types').GroupStop} from
 * @param {import('@/types').GroupStop} to
 * @returns {import('@/types').GroupLeg}
 */
function toLeg(from, to) {
  const km = calcDistanceKm(from, to);
  return { from: from.id, to: to.id, km: Math.round(km), mode: legMode(km) };
}

/**
 * buildJourney가 이 결과에 이름·보정·이동 수단을 붙여요.
 *
 * @param {import('@/types').Photo[]} photos 순서는 상관없고, 이 배열은 바꾸지 않아요
 * @param {number[]} [splitAts] 여행을 나눌 시각(밀리초). 이 시각에 찍은 사진부터 새 여행이에요.
 *   split 보정의 사진을 빼도 나눈 자리가 남게, 사진 ID 대신 시각으로 받아요
 * @param {MergeSpan[]} [mergeSpans] 이을 시각 구간. 이 구간에 걸친 여행 경계는 집을 거치거나 14일 넘게 비어도 끊지 않아요.
 *   splitAts처럼 사진 ID 대신 시각으로 받아요
 * @returns {import('@/types').GroupResult}
 */
export function group(photos, splitAts = [], mergeSpans = []) {
  const located = /** @type {import('@/types').LocatedPhoto[]} */ (photos.filter(isLocated)).sort(
    byTakenMs,
  );
  const rawStops = buildStops(located, splitAts);
  // 나누면 지점 중심이 옮겨 집이 바뀔 수 있어서, 집은 나누기 전 지점으로 정해요.
  const home = findHome(splitAts.length > 0 ? buildStops(located, []) : rawStops);

  const timedOnly = photos.filter((photo) => hasTime(photo) && !isLocated(photo));
  const filledByStop = fillByTime(rawStops, located, timedOnly);
  const filled = new Set([...filledByStop.values()].flat());

  const entries = rawStops.map((raw) => {
    const filledPhotos = filledByStop.get(raw) ?? [];
    return { raw, filled: filledPhotos, stop: toGroupStop(raw, home, filledPhotos) };
  });

  return {
    home,
    stops: entries.map((entry) => entry.stop),
    trips: buildTrips(entries, splitAts, mergeSpans),
    unlocated: photos
      .filter((photo) => !isLocated(photo) && !filled.has(photo))
      .map((photo) => photo.id),
  };
}
