import { toUtcDay } from '@/utils/localDate';
import { calcDistanceKm } from '@/utils/distance';
import { legMode } from '@/utils/legMode';

// 지점·여행 규칙은 my-journey의 mock/reference-group.mjs와 같아서, seed를 넣으면 fixtures의 *.group.json과 같아요.
// fillByTime(#170)은 참고 구현에 없지만 seed에는 채울 사진이 없어서 결과가 같아요.

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
 */

/** @typedef {{ stop: import('@/types').GroupStop, raw: RawStop }} StopEntry */

const roundCoord = (value) => Math.round(value * COORD_SCALE) / COORD_SCALE;
const toInstant = (photo) => Date.parse(`${photo.takenAt}${photo.offset ?? DEFAULT_OFFSET}`);
const byInstant = (a, b) => toInstant(a) - toInstant(b);
const hasTime = (photo) => Boolean(photo.takenAt);
const isLocated = (photo) => hasTime(photo) && photo.lat !== null && photo.lng !== null;
const toPairs = (items) => items.slice(1).map((item, i) => [items[i], item]);

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
 *
 * @param {import('@/types').LocatedPhoto[]} photos 시각 순
 * @returns {RawStop[]}
 */
function buildStops(photos) {
  const stops = [];
  for (const photo of photos) {
    const at = toInstant(photo);
    const current = stops.at(-1);
    if (current && isSameStop(current, photo, at)) addToStop(current, photo, at);
    else stops.push({ lat: photo.lat, lng: photo.lng, photos: [photo], firstAt: at, lastAt: at });
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
  return calcDistanceKm(stop, photo) <= SAME_PLACE_KM && at - stop.lastAt < STOP_BREAK_MS;
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
 *
 * @param {RawStop[]} stops
 * @param {import('@/types').LocatedPhoto[]} located buildStops에 넣은 사진, 시각 순
 * @param {import('@/types').Photo[]} photos 시각만 있고 위치가 없는 사진
 * @returns {Map<RawStop, import('@/types').Photo[]>} 받은 순서 그대로
 */
function fillByTime(stops, located, photos) {
  const ats = located.map(toInstant);
  const stopOf = new Map(stops.flatMap((stop) => stop.photos.map((photo) => [photo, stop])));

  const findStopAround = (at) => {
    // 같은 시각에 찍은 사진이 있으면 앞뒤가 같은 사진일 수 있어요.
    const prev = ats.findLastIndex((t) => t <= at);
    const next = ats.findIndex((t) => t >= at);
    if (prev === -1 || next === -1) return null;

    const stop = stopOf.get(located[prev]);
    const isNear = at - ats[prev] <= MAX_FILL_GAP_MS && ats[next] - at <= MAX_FILL_GAP_MS;
    return isNear && stop === stopOf.get(located[next]) ? stop : null;
  };

  const filledByStop = new Map();
  for (const photo of photos) {
    const stop = findStopAround(toInstant(photo));
    if (!stop) continue;
    if (!filledByStop.has(stop)) filledByStop.set(stop, []);
    filledByStop.get(stop).push(photo);
  }
  return filledByStop;
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
  const days = countDays(raw.photos.map((photo) => photo.takenAt));
  const isHome = home !== null && calcDistanceKm(home, raw) <= SAME_PLACE_KM;
  // 안정 정렬이라 같은 시각이면 위치 있는 사진이 앞에 남아서, photoIds[0]이 지점 ID와 같아요.
  const photoIds = [...raw.photos, ...filledPhotos].toSorted(byInstant).map((photo) => photo.id);

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
 * @returns {import('@/types').GroupTrip[]}
 */
function buildTrips(entries) {
  return splitIntoRuns(entries).map(toTrip);
}

/**
 * @param {StopEntry[]} entries
 * @returns {StopEntry[][]} 집 지점이 끼거나 지점 사이가 14일 넘게 비면 끊은 묶음
 */
function splitIntoRuns(entries) {
  const runs = [];
  let current = null;
  let prevLastAt = null;

  for (const entry of entries) {
    if (entry.stop.isHome) {
      current = null;
    } else {
      if (!current || entry.raw.firstAt - prevLastAt > MAX_TRIP_GAP_MS) {
        current = [];
        runs.push(current);
      }
      current.push(entry);
    }
    prevLastAt = entry.raw.lastAt;
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
    days: countDays(run.flatMap((entry) => entry.raw.photos.map((photo) => photo.takenAt))),
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
 * @returns {import('@/types').GroupResult}
 */
export function group(photos) {
  const located = /** @type {import('@/types').LocatedPhoto[]} */ (photos.filter(isLocated)).sort(
    byInstant,
  );
  const rawStops = buildStops(located);
  const home = findHome(rawStops);

  const timedOnly = photos.filter((photo) => hasTime(photo) && !isLocated(photo));
  const filledByStop = fillByTime(rawStops, located, timedOnly);
  const filled = new Set([...filledByStop.values()].flat());

  const entries = rawStops.map((raw) => ({
    raw,
    stop: toGroupStop(raw, home, filledByStop.get(raw) ?? []),
  }));

  return {
    home,
    stops: entries.map((entry) => entry.stop),
    trips: buildTrips(entries),
    unlocated: photos
      .filter((photo) => !isLocated(photo) && !filled.has(photo))
      .map((photo) => photo.id),
  };
}
