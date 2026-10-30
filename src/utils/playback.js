// 01 지도 재생의 시간 계산이에요. 화면·requestAnimationFrame과 상관없이
// "재생을 시작하고 지난 시간(ms) ↔ 지도 진행 위치"만 바꿔요. 시간을 흘리는 건 usePlayback이 해요.

// 구간 하나를 이동하는 시간은 거리에 비례해요. 화면에서 비행기가 늘 비슷한 빠르기로 움직여요.
// 3,000km(서울 → 방콕쯤)가 0.9초예요.
const MOVE_MS_PER_KM = 0.3;
// 그대로 비례하면 부산 → 경주(79km)는 눈에 안 보이고, 지구 반 바퀴(16,000km)는 너무 길어서 위아래를 잘라요.
const MIN_MOVE_MS = 700;
const MAX_MOVE_MS = 2500;
// 지점에 도착하고 머무는 시간이에요. 피그마 01의 도착 사진 카드(Arrival stack)를 보여 줄 시간이에요.
// 집에 돌아오면 머물지 않고 바로 다음 여행을 떠나요(여행 사이 집에 있던 기간은 건너뛰어요).
const STAY_MS = 1000;

/**
 * 구간 하나의 재생 일정이에요. 시간은 모두 재생을 시작하고 지난 ms예요.
 *
 * @typedef {object} PlaybackStep
 * @property {number} startMs 이 구간을 출발하는 시간
 * @property {number} moveMs 이동하는 데 걸리는 시간
 * @property {number} stayMs 도착하고 머무는 시간. 집에 돌아오는 구간은 0
 */

/**
 * 전체 재생 일정이에요. steps[i]가 legs[i]의 일정이에요.
 *
 * @typedef {object} PlaybackTimeline
 * @property {PlaybackStep[]} steps
 * @property {number} totalMs 마지막 구간까지 끝나는 시간. 구간이 0개면 0
 */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 구간 하나를 이동하는 데 걸리는 재생 시간(ms)이에요. 거리에 비례하고 최소·최대가 있어요.
 *
 * @param {number} km
 * @returns {number}
 */
export function calcMoveMs(km) {
  return clamp(km * MOVE_MS_PER_KM, MIN_MOVE_MS, MAX_MOVE_MS);
}

/**
 * 구간들을 이어서 재생 일정을 만들어요.
 *
 * @param {import('@/types').Leg[]} legs 시간 순서대로
 * @returns {PlaybackTimeline}
 */
export function buildTimeline(legs) {
  const steps = [];
  let startMs = 0;
  for (const leg of legs) {
    const moveMs = calcMoveMs(leg.km);
    const stayMs = leg.to === 'home' ? 0 : STAY_MS;
    steps.push({ startMs, moveMs, stayMs });
    startMs += moveMs + stayMs;
  }
  return { steps, totalMs: startMs };
}

/**
 * 지난 시간으로 지금 진행 위치를 계산해요.
 * 도착하고 머무는 동안은 그 구간의 t: 1이에요.
 * 전체 시간을 넘었거나 구간이 0개면 null(다 그린 상태)이에요.
 *
 * @param {PlaybackTimeline} timeline
 * @param {number} elapsedMs
 * @returns {import('@/utils/routeMap').RouteProgress | null}
 */
export function calcPosition({ steps, totalMs }, elapsedMs) {
  if (steps.length === 0 || elapsedMs > totalMs) return null;

  const elapsed = Math.max(0, elapsedMs);
  // 머무는 시간까지 포함해서 아직 끝나지 않은 첫 구간이 지금 구간이에요.
  // 경계에선 앞 구간의 도착(t: 1)으로 봐요. 그래야 집에 도착한 순간도 한 번은 보여요.
  const legIndex = steps.findIndex((step) => elapsed <= step.startMs + step.moveMs + step.stayMs);
  const { startMs, moveMs } = steps[legIndex];
  return { legIndex, t: Math.min(1, (elapsed - startMs) / moveMs) };
}

/**
 * calcPosition의 반대예요. 진행 위치에 해당하는 지난 시간을 돌려줘요.
 * 위치를 옮길 때(seek) 써요. t: 1은 도착한 순간(머물기 시작)이에요.
 * position이 null이거나 legIndex가 구간 수를 넘으면 다 그린 상태라 Infinity예요.
 *
 * @param {PlaybackTimeline} timeline
 * @param {import('@/utils/routeMap').RouteProgress | null} position
 * @returns {number}
 */
export function calcElapsedMs({ steps }, position) {
  if (!position || position.legIndex >= steps.length) return Infinity;

  const { startMs, moveMs } = steps[Math.max(0, position.legIndex)];
  return startMs + clamp(position.t, 0, 1) * moveMs;
}

/**
 * 날짜로 진행 위치를 계산해요. 01 아래 타임라인(날짜 축)을 끌 때 seek에 넘길 값이에요.
 * 이동 중이면 출발·도착 시각 사이의 비율이 t이고, 지점(또는 집)에 머무는 중이면 앞 구간의 t: 1이에요.
 * 첫 출발보다 앞이면 { legIndex: 0, t: 0 }, 마지막 도착보다 뒤거나 구간이 0개면 null이에요.
 *
 * @param {import('@/types').Leg[]} legs 시간 순서대로
 * @param {Date | string} date 문자열이면 시간대가 붙은 ISO 형식. 예: '2025-06-28T18:30:51-07:00'
 * @returns {import('@/utils/routeMap').RouteProgress | null}
 */
export function calcPositionAtDate(legs, date) {
  const time = new Date(date).getTime();
  const legIndex = legs.findIndex((leg) => time <= Date.parse(leg.arriveAt));
  if (legIndex === -1) return null;

  const leg = legs[legIndex];
  const departMs = Date.parse(leg.departAt);
  if (time <= departMs) {
    return legIndex === 0 ? { legIndex: 0, t: 0 } : { legIndex: legIndex - 1, t: 1 };
  }
  return { legIndex, t: (time - departMs) / (Date.parse(leg.arriveAt) - departMs) };
}
