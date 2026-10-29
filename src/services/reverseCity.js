import {
  CACHE_RADIUS_KM,
  COOLDOWN_MS,
  COORDINATE_DIGITS,
  FAILURE_LIMIT,
  GEOCODE_QUERY,
  GEOCODE_URL,
  REQUEST_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  UNKNOWN_PLACE,
} from '@/constants/geocode';
import { calcDistanceKm } from '@/utils/distance';
import { parsePlaceResponse } from '@/utils/placeName';

const MAX_LAT = 90;
const MAX_LNG = 180;

const isCoordinate = (value, limit) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

// 정확한 위치가 나가지 않게 자릿수를 줄이고, 아주 작은 수가 1e-7처럼 지수로 적히지 않게 숫자로 되돌려 적어요.
const formatCoordinate = (value) => String(Number(value.toFixed(COORDINATE_DIGITS)));

function buildUrl(lat, lng) {
  const params = new URLSearchParams({
    ...GEOCODE_QUERY,
    lat: formatCoordinate(lat),
    lon: formatCoordinate(lng),
  });
  return `${GEOCODE_URL}?${params}`;
}

// 응답이 오기 전에 시간이 넘으면 요청을 끊어요. fetch가 signal을 무시해도 기다리지 않게 경주시켜요.
async function fetchJson(fetchFn, url, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('시간이 넘었어요'));
    }, timeoutMs);
  });
  const request = (async () => {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })();
  // 시간 초과로 진 쪽이 나중에 실패해도 처리 안 된 오류로 남지 않게 해요.
  request.catch(() => {});

  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 좌표로 도시 이름을 찾는 함수를 만들어요. 앱에서는 아래 기본값 reverseCity를 쓰고,
 * 테스트에서는 가짜 fetchFn·시계를 넣어 새 캐시와 함께 만들어요.
 *
 * - 약 1km 안은 이전 결과를 다시 쓰고, 같은 곳을 동시에 물으면 요청 하나를 같이 기다려요.
 * - 요청은 한 번에 하나씩, 시작 시각 사이에 간격을 두고 보내요.
 * - 요청이 실패하면(네트워크·시간 초과·HTTP 오류·이상한 응답) 이름 없는 곳을 돌려주고 캐시하지 않아요.
 *   연달아 FAILURE_LIMIT번 실패하면 COOLDOWN_MS 동안은 요청 없이 바로 이름 없는 곳을 돌려줘요.
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchFn]
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {() => number} [options.now] 밀리초 시계예요. 거꾸로 가지 않는 시계여야 해요
 * @param {number} [options.intervalMs]
 * @param {number} [options.timeoutMs]
 * @param {number} [options.failureLimit]
 * @param {number} [options.cooldownMs]
 * @returns {(lat: number, lng: number) => Promise<import('@/types').Place>}
 */
export function createReverseCity({
  fetchFn = (...args) => globalThis.fetch(...args),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => performance.now(),
  intervalMs = REQUEST_INTERVAL_MS,
  timeoutMs = REQUEST_TIMEOUT_MS,
  failureLimit = FAILURE_LIMIT,
  cooldownMs = COOLDOWN_MS,
} = {}) {
  const entries = [];
  let queue = Promise.resolve();
  let lastStartAt = -Infinity;
  let failures = 0;
  let pausedUntil = -Infinity;

  // 장소를 돌려주고, 실패하면 null을 돌려줘요. 던지지 않아서 queue가 끊기지 않아요.
  async function request(lat, lng) {
    if (now() < pausedUntil) return null;

    const wait = lastStartAt + intervalMs - now();
    if (wait > 0) await sleep(wait);
    lastStartAt = now();

    try {
      const place = parsePlaceResponse(await fetchJson(fetchFn, buildUrl(lat, lng), timeoutMs));
      if (!place) throw new Error('위치 응답이 아니에요');
      failures = 0;
      return place;
    } catch {
      failures += 1;
      if (failures >= failureLimit) pausedUntil = now() + cooldownMs;
      return null;
    }
  }

  function findEntry(lat, lng) {
    let nearest = null;
    let nearestKm = Infinity;
    for (const entry of entries) {
      const km = calcDistanceKm(entry, { lat, lng });
      if (km <= CACHE_RADIUS_KM && km < nearestKm) {
        nearest = entry;
        nearestKm = km;
      }
    }
    return nearest;
  }

  function addEntry(lat, lng) {
    const entry = { lat, lng };
    entry.promise = queue
      .then(() => request(lat, lng))
      .then((place) => {
        if (!place) entries.splice(entries.indexOf(entry), 1);
        return place;
      });
    queue = entry.promise;
    entries.push(entry);
    return entry;
  }

  return async function reverseCity(lat, lng) {
    if (!isCoordinate(lat, MAX_LAT) || !isCoordinate(lng, MAX_LNG)) return { ...UNKNOWN_PLACE };

    const entry = findEntry(lat, lng) ?? addEntry(lat, lng);
    const place = await entry.promise;
    // 받은 쪽이 객체를 고쳐도 캐시가 바뀌지 않게 복사해서 줘요.
    return { ...(place ?? UNKNOWN_PLACE) };
  };
}

/** 앱 전체가 같이 쓰는 reverseCity예요. 좌표(lat, lng)로 { city, country, cc }를 찾고, 던지지 않아요. */
export const reverseCity = createReverseCity();
