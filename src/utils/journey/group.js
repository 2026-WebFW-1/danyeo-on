import { toUtcDay } from '@/utils/localDate';
import { calcDistanceKm } from '@/utils/distance';
import { legMode } from '@/utils/legMode';

// 1. 여행 결정 관련 상수 정의
const SAME_PLACE_KM = 60; // 지점·집 지역 둘 다 이 거리
const STOP_GAP_DAYS = 21; // 딱 21일이면 끊음 (< 21)
const TRIP_GAP_DAYS = 14; // 딱 14일은 이어짐 (> 14일 때 끊음)
const CHAPTER_DAYS = 14; // 14일 이상이면 챕터 (>= 14)
const DEFAULT_OFFSET = '+09:00';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// 21일을 밀리초로. 사진 시각(at, lastAt)이 밀리초라 단위를 맞춰요.
const STOP_GAP_MS = STOP_GAP_DAYS * MS_PER_DAY;
const TRIP_GAP_MS = TRIP_GAP_DAYS * MS_PER_DAY;
const COORD_SCALE = 1e5;

// 2. 작은 도우미
const roundCoord = (value) => Math.round(value * COORD_SCALE) / COORD_SCALE;
const toInstant = (photo) => Date.parse(`${photo.takenAt}${photo.offset ?? DEFAULT_OFFSET}`);

/**
 * 현지 날짜로 가장 이른 날부터 가장 늦은 날까지, 첫날과 마지막 날을 모두 세요.
 * 자정 무렵 시간대를 넘나들면 현지 날짜 순서가 촬영 순서와 거꾸로일 수 있어서,
 * 처음·마지막 사진이 아니라 모든 사진의 날짜에서 가장 이른 날과 늦은 날을 골라요.
 *
 * @param {string[]} takenAts 시간대 없는 현지 시각. 예: '2025-01-01T23:20:00'
 * @returns {number} 1 이상
 */
const countDays = (takenAts) => {
  const utcDays = takenAts.map(toUtcDay);
  return (Math.max(...utcDays) - Math.min(...utcDays)) / MS_PER_DAY + 1;
};

/**
 * 경도를 -180 이상 180 미만으로 되돌려요.
 * 들어오는 값은 -360 ~ 360 안이라 한 번만 돌리면 돼요. 범위 안의 값은 그대로라 소수점이 바뀌지 않아요.
 */
const wrapLng = (lng) => {
  if (lng >= 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
};

/** 3. 지점 묶기
 * 시각 순으로 훑으며 사진을 지점(머문 곳)으로 묶어요.
 * 묶음 중심에서 60km 안이고 직전 사진과 21일 미만이면 같은 지점이에요.
 * 중심은 사진 좌표의 평균이라, 사진이 들어올 때마다 조금씩 옮겨요.
 *
 * 마지막 지점과만 비교해요. 예전 지점으로 돌아가지 않아서,
 * 토론토 → 나이아가라 → 토론토면 토론토 지점이 새로 하나 더 생겨요.
 *
 * @param {import('@/types').LocatedPhoto[]} photos
 *   takenAt·lat·lng가 다 있고 시각 순으로 정렬된 사진이에요. 거르고 정렬하는 건 group()이 먼저 해요.
 *   여기서 읽는 칸은 takenAt·offset(시각)과 lat·lng(위치)뿐이에요.
 * @returns {{
 *   lat: number,
 *   lng: number,
 *   photos: import('@/types').LocatedPhoto[],
 *   firstAt: number,
 *   lastAt: number,
 * }[]}
 *   lat·lng: 묶음 중심(반올림 전)
 *   photos: 이 지점에 든 사진, 시각 순
 *   firstAt·lastAt: 첫·마지막 사진의 실제 시각(밀리초). 여행을 자를 때만 쓰고 결과에는 안 나가요
 */
function buildStops(photos) {
  const stops = [];
  for (const photo of photos) {
    // '2024-09-01T19:00:59' + '+07:00' → 실제 시각(밀리초). 시간대가 없으면 +09:00으로 봐요.
    const at = toInstant(photo);
    // 지금 묶고 있는 지점. 첫 사진의 경우 undefined
    const current = stops.at(-1);

    if (current && isSameStop(current, photo, at)) {
      current.photos.push(photo);

      current.lat += (photo.lat - current.lat) / current.photos.length;
      // 날짜변경선을 넘으면 179.9와 -179.9의 차이가 359.8이 돼요. 짧은 쪽(-0.2)으로 바꿔 평균을 내야
      // 중심이 지구 반대편(경도 0)으로 가지 않아요.
      const lngDelta = wrapLng(photo.lng - current.lng);
      current.lng = wrapLng(current.lng + lngDelta / current.photos.length);
      current.lastAt = at;
    } else {
      // 새 지점
      stops.push({
        lat: photo.lat,
        lng: photo.lng,
        photos: [photo],
        firstAt: at,
        lastAt: at,
      });
    }
  }

  return stops;
}

/**
 * 사진이 지금 묶고 있는 지점에 들어가는지 봐요.
 *
 * @param {{ lat: number, lng: number, lastAt: number }} stop 지금 묶고 있는 지점
 * @param {import('@/types').LocatedPhoto} photo
 * @param {number} at photo의 실제 시각(밀리초)
 * @returns {boolean}
 */
function isSameStop(stop, photo, at) {
  // 묶은 중심과의 거리
  const distanceKm = calcDistanceKm(stop, photo);
  // 직전 사진 뒤로 흐른 시간
  const gapMs = at - stop.lastAt;

  return distanceKm <= SAME_PLACE_KM && gapMs < STOP_GAP_MS;
}

/**
 * 지점을 60km 지역으로 모아, 사진이 가장 많은 지역을 집으로 봐요.
 * 지역이 하나뿐이면 어디가 집이고 어디가 여행지인지 알 수 없어서 집이 없어요.
 * 사진 수가 같으면 먼저 나온 지역이에요.
 *
 * @param {ReturnType<typeof buildStops>} stops
 * @returns {{ lat: number, lng: number } | null}
 */
function findHome(stops) {
  const regions = [];

  for (const stop of stops) {
    // 앞에서부터 60km 안에 있는 첫 지역을 찾아요. 없으면 undefined
    const region = regions.find((r) => calcDistanceKm(r, stop) <= SAME_PLACE_KM);

    // 지점 개수가 아니라 사진 수를 더해요.
    if (region) region.photoCount += stop.photos.length;
    else
      regions.push({
        lat: stop.lat,
        lng: stop.lng,
        photoCount: stop.photos.length,
      });
  }

  if (regions.length <= 1) return null;

  const top = regions.reduce((best, r) => (r.photoCount > best.photoCount ? r : best));

  return {
    lat: roundCoord(top.lat),
    lng: roundCoord(top.lng),
  };
}

/** 5. 여행 자르기
 * 지점을 여행으로 묶어요.
 * 집 지점이 끼거나 지점 사이가 14일 넘게 비면 여행을 끊어요.
 * 구간 거리는 반올림한 지점 좌표로 재요.
 *
 * @param {import('@/types').GroupStop[]} stops
 *   group()에서 만든 지점이에요. isHome을 보고 집이면 여행을 닫아요.
 * @param {ReturnType<typeof buildStops>} rawStops
 *   stops와 같은 순서예요. 공백은 이쪽의 실제 시각(firstAt·lastAt)으로 재요.
 * @returns {import('@/types').GroupTrip[]}
 *   id: 첫 지점 ID
 *   stopIds: 여행에 든 지점 ID, 시각 순
 *   from·to: 첫 지점의 from, 마지막 지점의 to
 *   days: 첫날과 마지막 날을 모두 센 날 수
 *   legs: 여행 안 지점 사이 구간. 집에서 나가고 들어오는 구간은 buildJourney 몫이에요
 */
function buildTrips(stops, rawStops) {
  // 여행 일수를 셀 때 지점 안 모든 사진의 날짜가 필요해요(countDays).
  const takenAtsByStopId = new Map(
    stops.map((stop, i) => [stop.id, rawStops[i].photos.map((photo) => photo.takenAt)]),
  );
  const runs = []; // 여행 하나 = 이어진 지점 배열 하나
  let current = null; // 지금 채우고 있는 여행. 집에 있는 동안은 null
  let prevLastAt = null; // 직전 지점의 마지막 사진 시각

  stops.forEach((stop, i) => {
    // stops[i]와 rawStops[i]는 같은 지점이에요. 실제 시각은 rawStops에만 있어요.
    const { firstAt, lastAt } = rawStops[i];

    if (stop.isHome) {
      // 집에 돌아왔으니 여행을 닫아요.
      current = null;
    } else {
      // 직전 지점 마지막 사진 → 이 지점 첫 사진 사이에 흐른 시간
      const gapMs = firstAt - prevLastAt;
      // 집 다음 첫 지점이거나, 집 사진 없이 14일 넘게 비었으면 새 여행. 딱 14일은 이어요.
      if (!current || gapMs > TRIP_GAP_MS) {
        current = [];
        runs.push(current);
      }
      current.push(stop);
    }

    // 집 지점이어도 갱신해요. 집 다음에는 current가 null이라 이 값을 안 봐요.
    prevLastAt = lastAt;
  });

  return runs.map((run) => {
    const first = run[0];
    const last = run.at(-1);
    return {
      id: first.id,
      stopIds: run.map((stop) => stop.id),
      from: first.from,
      to: last.to,
      days: countDays(run.flatMap((stop) => takenAtsByStopId.get(stop.id))),
      // [A, B, C] → A→B, B→C. slice(1)로 B부터 돌고, run[i]가 바로 앞 지점이에요.
      legs: run.slice(1).map((stop, i) => {
        const km = calcDistanceKm(run[i], stop);
        // km는 반올림해서 저장하고, 이동 수단은 반올림 전 거리로 정해요(참고 구현과 같게).
        return { from: run[i].id, to: stop.id, km: Math.round(km), mode: legMode(km) };
      }),
    };
  });
}

/** 4. 거르고, 묶고, 지점 결과 만들기
 * 사진 목록을 지점(머문 곳)과 여행으로 묶어요. buildJourney가 이 결과에 이름·보정·이동 수단을 붙여요.
 * 규칙은 my-journey의 mock/reference-group.mjs와 같아서, seed 사진을 넣으면 fixtures의 *.group.json과 같게 나와요.
 *
 * @param {import('@/types').Photo[]} photos
 *   올린 사진 전부예요. 순서는 상관없고, 이 배열은 바꾸지 않아요.
 * @returns {import('@/types').GroupResult}
 *   home: 집 좌표. 지역이 하나뿐이면 null
 *   stops: 지점, 시각 순
 *   trips: 여행, 시각 순
 *   unlocated: 시각이나 위치가 없어 못 묶은 사진 ID, 받은 순서 그대로
 */
export function group(photos) {
  // 1. 시각과 위치가 다 있는 사진만 묶습니다.
  const isLocated = (photo) => Boolean(photo.takenAt) && photo.lat !== null && photo.lng !== null;

  // filter는 걸러도 타입을 좁히지 않아서, 거른 결과가 LocatedPhoto[]라고 직접 적어 줘요.
  const located = /** @type {import('@/types').LocatedPhoto[]} */ (photos.filter(isLocated)).sort(
    (a, b) => toInstant(a) - toInstant(b),
  );

  // 시각이 없는 사진은 정렬하지 않고 받은 순서대로 두기만 합니다.
  const unlocated = photos.filter((photo) => !isLocated(photo)).map((photo) => photo.id);

  const rawStops = buildStops(located);
  const home = findHome(rawStops);

  const stops = rawStops.map((raw) => {
    const first = raw.photos[0];
    const last = raw.photos.at(-1);

    const days = countDays(raw.photos.map((photo) => photo.takenAt));

    const isHome = home ? calcDistanceKm(home, raw) <= SAME_PLACE_KM : false;

    return {
      id: first.id,

      lat: roundCoord(raw.lat),
      lng: roundCoord(raw.lng),

      offset: first.offset,

      from: first.takenAt,
      to: last.takenAt,

      days,

      photoIds: raw.photos.map((photo) => photo.id),

      isHome,

      chapter: !isHome && days >= CHAPTER_DAYS,
    };
  });

  return {
    home,
    stops,
    trips: buildTrips(stops, rawStops),
    unlocated,
  };
}
