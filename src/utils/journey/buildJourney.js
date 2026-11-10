import { chapterSlug } from '@/utils/chapterSlug';
import { calcDistanceKm } from '@/utils/distance';
import { group } from '@/utils/journey/group';
import { legMode } from '@/utils/legMode';
import { toLocalDate } from '@/utils/localDate';

// 1. 상수
const DEFAULT_OFFSET = '+09:00';

/**
 * 이동 수단마다 속도와 더 드는 시간입니다. 집 <> 첫, 마지막 지점의 이동 시간을 추정할 때 씁니다.
 * 집 사진 시각을 쓰면 서울 -> 방콕이 100시간이 되어버리니 거리 ÷ 속도로 추정합니다.
 * 수단이 늘면 여기에 한 줄만 더하면 됩니다.
 */
const TRAVEL_MODES = {
  flight: { kmh: 800, extraHours: 0.5 }, // 타고 내리는 시간
  train: { kmh: 120, extraHours: 0 },
  car: { kmh: 70, extraHours: 0 },
};

/**
 * 구간 종류마다 어느 쪽 시각을 추정하는지입니다. 집 쪽 시각만 사진으로 알 수 없습니다.
 * 여기에 없는 종류(between, gap)는 출발, 도착 모두 사진 시각입니다.
 */
const ESTIMATED_END = { outbound: 'depart', return: 'arrive' };

const MS_PER_MINUTE = 60 * 1000; // 1분
const MS_PER_HOUR = 60 * MS_PER_MINUTE; // 1시간
const LOCAL_TIME_LENGTH = 'YYYY-MM-DDTHH:mm:ss'.length;
/** 지구 반 바퀴를 경도 각도로 나타낸 값 */
const HALF_TURN_DEG = 180;
/** 여행 이름을 자동으로 만들 때 도시 이름 사이에 사용합니다. */
const TRIP_NAME_SEPARATOR = ' · ';
const HOME = 'home';

// 2. 작은 도우미

/** 사진의 시간대입니다. 없으면 group과 똑같이 +09:00으로 봅니다. */
const offsetOf = (photo) => photo.offset ?? DEFAULT_OFFSET;

/**
 * 사진의 현지 시각 뒤에 시간대를 붙여요. Journey의 from·to·departAt·arriveAt이 이 모양이에요.
 *
 * @param {import('@/types').Photo} photo
 * @returns {string} 예: '2024-07-11T20:10:08+07:00'
 */
const withOffset = (photo) => `${photo.takenAt}${offsetOf(photo)}`;

/**
 * 사진을 찍은 순간을 밀리초로 바꿔요.
 * 시간대가 다른 두 사진은 문자열로 빼거나 비교할 수 없어서, 숫자로 바꿔 계산해요.
 *
 * @param {import('@/types').Photo} photo
 * @returns {number} 예: 1720703408000
 */
const toInstant = (photo) => Date.parse(withOffset(photo));

/**
 * 시간을 소수 첫째 자리까지 반올림해요. Leg.hours가 이 자릿수예요.
 *
 * @param {number} hours
 * @returns {number} 예: 5.1347 → 5.1
 */
const roundHours = (hours) => Math.round(hours * 10) / 10;

/**
 * 거리와 이동 수단으로 걸린 시간을 추정해요.
 * 집에서 나간 시각과 돌아온 시각은 사진으로 알 수 없어서 이 값으로 채워요.
 *
 * @param {number} km 구간 거리
 * @param {import('@/types').Leg['mode']} mode
 * @returns {number} 시간. 예: 3717km 비행 → 5.15
 */
const calcTravelHours = (km, mode) => km / TRAVEL_MODES[mode].kmh + TRAVEL_MODES[mode].extraHours;

/**
 * 밀리초 시각을 그 시간대의 현지 시각 문자열로 바꿉니다. (toInstant를 거꾸로)
 * Date는 UTC로만 읽혀서, 시간대만큼 더한 뒤 UTC로 읽고 시간대를 붙입니다.
 *
 * @param {number} ms ex: 1720684868000
 * @param {string} offset ex: '+09:00'
 * @returns {string} ex: '2024-07-11T17:01:08+09:00'
 */
function formatAt(ms, offset) {
  const [, sign, hh, mm] = offset.match(/([+-])(\d{2}):(\d{2})/);
  const direction = sign === '-' ? -1 : 1;
  const offsetMinutes = Number(hh) * 60 + Number(mm);
  const offsetMs = direction * offsetMinutes * MS_PER_MINUTE;

  // UTC 숫자에 시간대만큼 더해, UTC로 읽었을 때 현지 시각이 나옵니다.
  const localIso = new Date(ms + offsetMs).toISOString(); // '2024-07-11T17:01:08.000Z'
  const localTime = localIso.slice(0, LOCAL_TIME_LENGTH); // '2024-07-11T17:01:08'

  return `${localTime}${offset}`;
}

/**
 * 날짜에서 n년을 더하거나 뺍니다. 기간 필터 (1Y, 2Y)의 시작일을 만들 때 씁니다.
 *
 * @param {string} date ex: '2026-08-16'
 * @param {number} n 빼려면 음수 ex: -1
 * @returns {string} ex: '2025-08-16'
 */
function addYears(date, n) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCFullYear(day.getUTCFullYear() + n);
  return toLocalDate(day.toISOString());
}

/**
 * 보정 목록에서 한 종류만 꺼냅니다.
 *
 * @param {import('@/types').Correction[]} corrections
 * @param {import('@/types').Correction['type']} type
 * @returns {import('@/types').Correction[]}
 */
const filterByType = (corrections, type) =>
  corrections.filter((correction) => correction.type === type);

/**
 * id로 바로 찾을 수 있게 표로 만듭니다.
 * ex) photoById.get('p_356b49') // { id: 'p_356b49', takenAt: '2024-07-11T20:10:08', ... }
 *
 * @template {{ id: string }} T
 * @param {T[]} items
 * @returns {Map<string, T>}
 */
const indexById = (items) => new Map(items.map((item) => [item.id, item]));

// 3. 묶기 전 준비

/**
 * 사용자가 뺀 사진의 ID를 모읍니다.
 * Set을 쓰는 이유는 사진이 많아지면 has가 includes보다 빨라서이며 수백 장이라 차이가 납니다.
 *
 * @param {import('@/types').Correction[]} excludeCorrections
 * @returns {Set<string>}
 */
const collectExcludedIds = (excludeCorrections) =>
  new Set(excludeCorrections.map((correction) => correction.photoId));

/**
 * 사용자가 뺀 사진을 거릅니다.
 * 묶은 뒤에 빼면 지점 중심, 일수, 여행 경계가 뺀 사진 기준으로 정해져서 묶기 전에 뺍니다.
 *
 * @param {import('@/types').Photo[]} photos
 * @param {Set<string>} excludedIds
 * @returns {import('@/types').Photo[]}
 */
const removePhotos = (photos, excludedIds) => photos.filter((photo) => !excludedIds.has(photo.id));

/**
 * group의 여행은 trip.stopIds처럼 여행 -> 지점 방향으로만 적혀 있어서,
 * 지점이 어느 여행인지 찾을 수 있게 뒤집은 표를 만듭니다. 집 지점은 어느 여행에도 없어서 이 표에 없습니다.
 * trips: [{ id: 'p_356b49', stopIds: ['p_356b49', 'p_75d831'] }]
 * ex) tripIdByStopId.get('p_75d831') // 'p_356b49'
 *
 * @param {import('@/types').GroupTrip[]} trips
 * @returns {Map<string, string>} 지점 ID -> 여행 ID
 */
function mapTripIdByStopId(trips) {
  const tripIdByStopId = new Map();
  trips.forEach((trip) => trip.stopIds.forEach((id) => tripIdByStopId.set(id, trip.id)));
  return tripIdByStopId;
}

// 4. 지점

/**
 * 집과 지점들의 도시 이름을 찾습니다. 앱에선 네트워크라 한꺼번에 기다립니다.
 * 집 지점은 화면의 지점 목록에 안 나가서 이름을 찾지 않고, 집 이름은 home으로 따로 찾습니다.
 *
 * @param {import('@/types').GroupResult} grouped
 * @param {(lat: number, lng: number) => import('@/types').Place | Promise<import('@/types').Place>} findPlace
 * @returns {Promise<{ home: import('@/types').Place | null, byStopId: Map<string, import('@/types').Place> }>}
 */
async function findPlaces(grouped, findPlace) {
  const awayStops = grouped.stops.filter((stop) => !stop.isHome);
  const places = await Promise.all(awayStops.map((stop) => findPlace(stop.lat, stop.lng)));
  const home = grouped.home ? await findPlace(grouped.home.lat, grouped.home.lng) : null;

  return {
    home,
    byStopId: new Map(awayStops.map((stop, i) => [stop.id, places[i]])),
  };
}

/**
 * 경유 보정에 든 사진 ID를 모읍니다.
 * 지점 ID 대신 사진 ID로 저장돼서, 사진을 더 올려 지점 ID가 바뀌어도 보정이 살아남습니다.
 *
 * @param {import('@/types').Correction[]} transitCorrections
 * @returns {Set<string>}
 */
const collectTransitPhotoIds = (transitCorrections) =>
  new Set(transitCorrections.flatMap((correction) => correction.photoIds));

/**
 * 챕터 지점에 주소(slug)를 붙입니다. 주소 규칙은 chapterSlug 하나로 둡니다.
 * 도시 이름의 /·?·# 같은 글자를 바꾸고, 바꾼 뒤 겹치면 -2, -3을 붙여요. 앞서 쓴 주소를 모아 넘겨요.
 *
 * @param {import('@/types').Stop[]} stops 시각 순. 먼저 간 쪽이 번호 없는 주소를 받아요
 * @returns {import('@/types').Stop[]}
 */
function attachChapterSlugs(stops) {
  const takenSlugs = new Set();

  return stops.map((stop) => {
    if (!stop.chapter) return stop;

    const slug = chapterSlug(stop, takenSlugs);
    if (slug) takenSlugs.add(slug);
    return { ...stop, slug };
  });
}

/**
 * group 지점 중 집이 아닌 것을 Journey의 Stop 모양으로 바꿉니다. 집은 home 하나로만 나갑니다.
 *
 * @param {import('@/types').GroupStop[]} groupStops 집 포함, 시각 순
 * @param {Map<string, import('@/types').Place>} placeByStopId
 * @param {Set<string>} transitPhotoIds
 * @param {{ photoById: Map<string, import('@/types').Photo>, tripIdByStopId: Map<string, string> }} lookup
 * @returns {import('@/types').Stop[]}
 */
function buildStops(groupStops, placeByStopId, transitPhotoIds, lookup) {
  const stops = groupStops
    .filter((stop) => !stop.isHome)
    .map((stop) => {
      const stopPhotos = stop.photoIds.map((id) => lookup.photoById.get(id));
      const { city, country, cc } = placeByStopId.get(stop.id);

      return {
        id: stop.id,
        tripId: lookup.tripIdByStopId.get(stop.id),
        lat: stop.lat,
        lng: stop.lng,
        city,
        country,
        cc,
        from: withOffset(stopPhotos[0]),
        to: withOffset(stopPhotos.at(-1)),
        days: stop.days,
        chapter: stop.chapter,
        slug: null, // 챕터만 attachChapterSlugs가 채워요
        // 사진 중 하나라도 경유 보정에 있으면 경유 지점입니다.
        transit: stop.photoIds.some((id) => transitPhotoIds.has(id)),
        photoIds: stop.photoIds,
        photoCount: stopPhotos.length,
        // 이미지가 있는 첫 사진. HEIC처럼 못 올린 사진은 fileKey가 null이라 건너뜁니다.
        coverFileKey: stopPhotos.find((photo) => photo.fileKey)?.fileKey ?? null,
      };
    });

  return attachChapterSlugs(stops);
}

// 5. 구간

/**
 * 선을 그을 점을 고릅니다. 이웃한 점끼리 이으면 구간이 됩니다.
 * 경유 지점은 건너뛰고(사진은 지점에 남습니다), 집 지점이 연달아 있으면 집 하나로 합칩니다.
 *
 * @param {import('@/types').GroupStop[]} groupStops 집 포함, 시각 순
 * @param {Map<string, import('@/types').Stop>} stopById 집이 아닌 지점
 * @returns {(import('@/types').GroupStop & { firstPhotoId: string, lastPhotoId: string })[]}
 *   firstPhotoId: 이 점에 도착한 사진 / lastPhotoId: 이 점에서 떠난 사진
 */
function pickLinePoints(groupStops, stopById) {
  const points = [];

  for (const stop of groupStops) {
    if (!stop.isHome && stopById.get(stop.id).transit) continue;

    const prev = points.at(-1);
    if (stop.isHome && prev?.isHome) {
      // 합친 집에서 다음 여행으로 떠나는 사진은 뒤쪽 집 지점의 마지막 사진입니다.
      prev.lastPhotoId = stop.photoIds.at(-1);
      continue;
    }

    points.push({ ...stop, firstPhotoId: stop.photoIds[0], lastPhotoId: stop.photoIds.at(-1) });
  }

  return points;
}

/**
 * 두 점 사이 구간의 종류를 정합니다.
 *
 * @returns {import('@/types').Leg['kind']}
 *   outbound: 집 -> 지점 / return: 지점 -> 집 / between: 같은 여행 안 / gap: 집에 안 들르고 다음 여행으로
 */
function getLegKind(from, to, tripIdByStopId) {
  if (from.isHome) return 'outbound';
  if (to.isHome) return 'return';
  return tripIdByStopId.get(from.id) === tripIdByStopId.get(to.id) ? 'between' : 'gap';
}

/**
 * 사용자가 고친 이동 수단을 찾습니다. 출발 지점의 사진 중에 fromPhotoId가 있으면 이 구간입니다.
 * 같은 구간을 여러 번 고쳤으면 마지막 보정이 이깁니다. 집에서 나가는 구간은 고칠 수 없습니다.
 *
 * @param {{ isHome: boolean, photoIds: string[] }} from
 * @param {import('@/types').Correction[]} modeCorrections
 * @returns {import('@/types').Leg['mode'] | null}
 */
function findUserMode(from, modeCorrections) {
  if (from.isHome) return null;
  const correction = modeCorrections.findLast((c) => from.photoIds.includes(c.fromPhotoId));
  return correction?.mode ?? null;
}

/**
 * 구간의 출발, 도착 시각과 걸린 시간을 정합니다.
 * 집 쪽 시각만 거리 ÷ 속도로 추정하고(ESTIMATED_END), 추정한 시각은 집 사진의 시간대로 적습니다.
 *
 * @param {import('@/types').Leg['kind']} kind
 * @param {import('@/types').Photo} departPhoto 앞 점의 마지막 사진
 * @param {import('@/types').Photo} arrivePhoto 뒤 점의 첫 사진
 * @param {number} travelHours 추정 이동 시간
 * @returns {Pick<import('@/types').Leg, 'departAt' | 'arriveAt' | 'hours' | 'timing'>}
 */
function calcLegTimes(kind, departPhoto, arrivePhoto, travelHours) {
  const estimatedEnd = ESTIMATED_END[kind];
  const travelMs = travelHours * MS_PER_HOUR;

  const departMs =
    estimatedEnd === 'depart' ? toInstant(arrivePhoto) - travelMs : toInstant(departPhoto);
  const arriveMs =
    estimatedEnd === 'arrive' ? toInstant(departPhoto) + travelMs : toInstant(arrivePhoto);

  return {
    departAt:
      estimatedEnd === 'depart'
        ? formatAt(departMs, offsetOf(departPhoto))
        : withOffset(departPhoto),
    arriveAt:
      estimatedEnd === 'arrive'
        ? formatAt(arriveMs, offsetOf(arrivePhoto))
        : withOffset(arrivePhoto),
    hours: roundHours((arriveMs - departMs) / MS_PER_HOUR),
    timing: estimatedEnd ? 'estimated' : 'photos',
  };
}

/**
 * 이웃한 두 점을 구간 하나로 만듭니다.
 *
 * @param {ReturnType<typeof pickLinePoints>[number]} from
 * @param {ReturnType<typeof pickLinePoints>[number]} to
 * @param {number} index 0부터
 * @param {import('@/types').Correction[]} modeCorrections
 * @param {{ photoById: Map<string, import('@/types').Photo>, tripIdByStopId: Map<string, string> }} lookup
 * @returns {import('@/types').Leg}
 */
function buildLeg(from, to, index, modeCorrections, lookup) {
  const kind = getLegKind(from, to, lookup.tripIdByStopId);
  const km = calcDistanceKm(from, to);
  const userMode = findUserMode(from, modeCorrections);
  // 이동 수단은 반올림 전 거리로 정합니다(group과 같게).
  const mode = userMode ?? legMode(km);
  const times = calcLegTimes(
    kind,
    lookup.photoById.get(from.lastPhotoId),
    lookup.photoById.get(to.firstPhotoId),
    calcTravelHours(km, mode),
  );

  return {
    id: `leg_${index + 1}`,
    // gap은 두 여행 사이라 어느 여행에도 넣지 않습니다. 나머지는 집이 아닌 쪽 지점의 여행입니다.
    tripId: kind === 'gap' ? null : lookup.tripIdByStopId.get(from.isHome ? to.id : from.id),
    kind,
    from: from.isHome ? HOME : from.id,
    to: to.isHome ? HOME : to.id,
    fromLatLng: [from.lat, from.lng],
    toLatLng: [to.lat, to.lng],
    ...times,
    km: Math.round(km),
    mode,
    modeSource: userMode ? 'user' : 'auto',
    // 경도 차가 180°를 넘으면 날짜변경선을 건넙니다. 지도가 선을 지구 반대편으로 돌리지 않게 그려야 합니다.
    crossesAntimeridian: Math.abs(to.lng - from.lng) > HALF_TURN_DEG,
  };
}

/**
 * 점 [A, B, C] -> 구간 A->B, B->C
 *
 * @param {ReturnType<typeof pickLinePoints>} points
 * @param {import('@/types').Correction[]} modeCorrections
 * @param {{ photoById: Map<string, import('@/types').Photo>, tripIdByStopId: Map<string, string> }} lookup
 * @returns {import('@/types').Leg[]}
 */
const buildLegs = (points, modeCorrections, lookup) =>
  // slice(1)로 B부터 돌면, points[i]가 바로 앞 점입니다.
  points.slice(1).map((to, i) => buildLeg(points[i], to, i, modeCorrections, lookup));

// 6. 여행

/**
 * 여행 이름을 정합니다. 이름 보정이 있으면 그 이름, 없으면 경유 아닌 도시를 ' · '로 잇습니다.
 * 이름 보정은 여행의 사진 중 하나(anchorPhotoId)로 찾고, 여러 번 고쳤으면 마지막 보정이 이깁니다.
 *
 * @param {import('@/types').Stop[]} tripStops
 * @param {import('@/types').Correction[]} renameCorrections
 * @returns {{ name: string, nameSource: import('@/types').Trip['nameSource'] }}
 */
function nameTrip(tripStops, renameCorrections) {
  const rename = renameCorrections.findLast((correction) =>
    tripStops.some((stop) => stop.photoIds.includes(correction.anchorPhotoId)),
  );
  if (rename) return { name: rename.name, nameSource: 'user' };

  const cities = new Set(tripStops.filter((stop) => !stop.transit).map((stop) => stop.city));
  return { name: [...cities].join(TRIP_NAME_SEPARATOR), nameSource: 'auto' };
}

/**
 * group 여행을 Journey의 Trip 모양으로 바꿉니다.
 *
 * @param {import('@/types').GroupTrip[]} groupTrips
 * @param {Map<string, import('@/types').Stop>} stopById
 * @param {import('@/types').Leg[]} legs
 * @param {import('@/types').Correction[]} renameCorrections
 * @returns {import('@/types').Trip[]}
 */
function buildTrips(groupTrips, stopById, legs, renameCorrections) {
  return groupTrips.map((trip) => {
    const tripStops = trip.stopIds.map((id) => stopById.get(id));
    return {
      id: trip.id,
      ...nameTrip(tripStops, renameCorrections),
      from: tripStops[0].from,
      to: tripStops.at(-1).to,
      days: trip.days,
      stopIds: trip.stopIds,
      legIds: legs.filter((leg) => leg.tripId === trip.id).map((leg) => leg.id),
      chapter: tripStops.some((stop) => stop.chapter),
    };
  });
}

// 7. 기간과 집

/**
 * 기간 필터(1Y, 2Y, ALL)의 범위를 정합니다. 여행이 없으면 null입니다.
 * 기준일은 오늘이 아니라 마지막 여행이 끝난 날입니다. 데모 데이터가 옛날이어도 1Y, 2Y가 비지 않게요.
 *
 * @param {import('@/types').Trip[]} trips 시각 순
 * @returns {import('@/types').Journey['periods']}
 */
function buildPeriods(trips) {
  if (trips.length === 0) return null;

  const anchor = toLocalDate(trips.at(-1).to);
  return {
    anchor,
    '1y': { from: addYears(anchor, -1), to: anchor },
    '2y': { from: addYears(anchor, -2), to: anchor },
    all: { from: toLocalDate(trips[0].from), to: anchor },
  };
}

/**
 * group의 집 좌표에 도시 이름을 붙입니다. 지역이 하나뿐이라 집이 없으면 null입니다.
 *
 * @param {import('@/types').GroupResult['home']} home
 * @param {import('@/types').Place | null} place
 * @returns {import('@/types').Journey['home']}
 */
const buildHome = (home, place) => (home ? { ...home, city: place.city } : null);

/**
 * 사진과 보정으로 화면이 받는 Journey를 만듭니다. 순서만 정하고, 일은 단계마다 함수가 합니다.
 * 순서: exclude 사진 빼기 -> group -> 지점 이름 및 경유 -> 구간(집 포함) -> 여행 이름 및 이동 수단 보정
 * 규칙은 my-journey의 mock/journey-fixture.mjs와 같아서, seed를 넣으면 fixtures의 *.journey.json과 같게 나옵니다.
 *
 * @param {import('@/types').Photo[]} photos 올린 사진 전부. 순서는 상관없습니다
 * @param {import('@/types').Correction[]} corrections 만든 순서
 * @param {(lat: number, lng: number) => import('@/types').Place | Promise<import('@/types').Place>} findPlace
 *   좌표의 도시 이름을 찾습니다. 앱에선 reverseCity를 그대로 넘기고, 테스트에선 fixture 값을 돌려줍니다.
 * @returns {Promise<import('@/types').Journey>}
 */
export async function buildJourney(photos, corrections, findPlace) {
  // 3. (사용자가) 뺀 사진을 거르고 묶기
  const excludedIds = collectExcludedIds(filterByType(corrections, 'exclude'));
  const keptPhotos = removePhotos(photos, excludedIds);
  const grouped = group(keptPhotos); // { home, stops, trips, unlocated }
  const lookup = {
    photoById: indexById(keptPhotos),
    tripIdByStopId: mapTripIdByStopId(grouped.trips),
  };

  // 4. 지점
  const places = await findPlaces(grouped, findPlace);
  const transitPhotoIds = collectTransitPhotoIds(filterByType(corrections, 'transit'));
  const stops = buildStops(grouped.stops, places.byStopId, transitPhotoIds, lookup);
  const stopById = indexById(stops);

  // 5. 구간
  const points = pickLinePoints(grouped.stops, stopById);
  const legs = buildLegs(points, filterByType(corrections, 'mode'), lookup);

  // 6. 여행
  const trips = buildTrips(grouped.trips, stopById, legs, filterByType(corrections, 'rename'));

  // 7. 기간과 집
  return {
    home: buildHome(grouped.home, places.home),
    stops,
    legs,
    trips,
    unlocated: grouped.unlocated,
    excluded: [...excludedIds],
    periods: buildPeriods(trips),
  };
}
