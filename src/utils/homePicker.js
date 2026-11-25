import { HOME_ID } from '@/constants/journey';
import { getCountryName } from '@/utils/countryName';
import { calcDistanceKm } from '@/utils/distance';
import { getCityKey } from '@/utils/cityKey';
import { SAME_PLACE_KM } from '@/utils/journey/group';
import { withObjectJosa, withTopicJosa } from '@/utils/josa';

/**
 * 집으로 고를 수 있는 도시 한 줄이에요.
 *
 * @typedef {object} HomeCandidate
 * @property {string} key 'KR/부산'
 * @property {string} city
 * @property {string} country 나라 이름. 모르면 빈 글자
 * @property {number | null} photoCount 그 도시의 사진 수. 지금 집은 내 사진을 아직 못 읽었으면 null
 * @property {string | null} coverFileKey 대표 사진
 * @property {string | null} photoId 집으로 저장할 사진 ID. 못 찾으면 null이고, 그 줄은 고를 수 없어요
 * @property {boolean} isCurrent 지금 집이면 true
 */

export const HOME_GUIDE_EMPTY = '집으로 삼을 도시를 골라 주세요. 내 사진이 있는 도시만 나와요.';

const isLocated = (photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng);

/**
 * 지금 집 근처(집을 가르는 60km 안)에서 찍은 사진이에요. 07에서 뺀 사진은 집 기록이 아니라서 빼요. 집에서 가까운 순이에요.
 *
 * @param {{ lat: number, lng: number }} home
 * @param {import('@/types').Photo[]} photos
 * @param {Set<string>} excludedIds
 * @returns {import('@/types').Photo[]}
 */
function findPhotosNearHome(home, photos, excludedIds) {
  return photos
    .filter((photo) => isLocated(photo) && !excludedIds.has(photo.id))
    .map((photo) => ({ photo, km: calcDistanceKm(home, photo) }))
    .filter(({ km }) => km <= SAME_PLACE_KM)
    .sort((a, b) => a.km - b.km)
    .map(({ photo }) => photo);
}

/**
 * 지금 집을 가리킬 사진 ID를 찾아요. 집에서 나가는 구간이 집 사진 ID(fromPhotoId)를 갖고 있어서 먼저 봐요.
 * 집 사진이 마지막 여행 뒤에만 있으면 그런 구간이 없어서, 내 사진 중 집 가까이서 찍은 것을 써요.
 * 둘 다 없으면(사진을 못 읽었거나 집 근처 사진이 07에서 모두 빠짐) null이에요.
 *
 * @param {import('@/types').Journey} journey home이 있어야 해요
 * @param {import('@/types').Photo[]} nearHomePhotos findPhotosNearHome의 결과
 * @returns {string | null}
 */
function findHomePhotoId(journey, nearHomePhotos) {
  const leg = journey.legs.find((item) => item.from === HOME_ID && item.fromPhotoId);
  return leg?.fromPhotoId ?? nearHomePhotos[0]?.id ?? null;
}

/**
 * 집 고르기 목록의 줄을 만들어요. 지금 집이 맨 위, 나머지는 사진이 많은 순이에요.
 * 지점은 도시(나라 + 이름)별로 묶고, 경유 지점은 빼요. 사진 수는 그 도시 지점들의 합이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {import('@/types').Photo[]} [photos] 내 사진. 지금 집의 사진 ID · 장수 · 대표 사진을 채울 때만 써요
 * @returns {HomeCandidate[]}
 */
export function selectHomeCandidates(journey, photos = []) {
  if (!journey) return [];

  const home = journey.home;
  const homeKey = home?.cc ? getCityKey(home) : null;
  const byKey = new Map();
  // 도시마다 대표 사진을 가져온 지점의 사진 수예요. 없으면 -1이라 어느 지점의 대표 사진이든 이겨요.
  const coverCounts = new Map();
  for (const stop of journey.stops) {
    if (stop.transit) continue;
    const key = getCityKey(stop);
    if (key === homeKey) continue;

    const group = byKey.get(key);
    if (!group) {
      byKey.set(key, {
        key,
        city: stop.city,
        country: stop.country,
        photoCount: stop.photoCount,
        coverFileKey: stop.coverFileKey,
        photoId: stop.photoIds[0] ?? stop.id,
        isCurrent: false,
      });
      coverCounts.set(key, stop.coverFileKey ? stop.photoCount : -1);
      continue;
    }
    group.photoCount += stop.photoCount;
    // 대표 사진은 사진이 가장 많은 지점의 것을 써요.
    if (stop.coverFileKey && stop.photoCount > coverCounts.get(key)) {
      group.coverFileKey = stop.coverFileKey;
      coverCounts.set(key, stop.photoCount);
    }
  }

  const others = [...byKey.values()].sort((a, b) => b.photoCount - a.photoCount);
  if (!home) return others;

  const nearHome = findPhotosNearHome(home, photos, new Set(journey.excluded));
  const current = {
    key: homeKey ?? HOME_ID,
    city: home.city,
    country: (home.cc && getCountryName(home.cc)) || '',
    photoCount: photos.length > 0 ? nearHome.length : null,
    coverFileKey: nearHome.find((photo) => photo.fileKey)?.fileKey ?? null,
    photoId: findHomePhotoId(journey, nearHome),
    isCurrent: true,
  };
  return [current, ...others];
}

/**
 * 고른 줄로 [이곳을 집으로]를 누를 수 있는지 봐요. 사진 ID를 모르면 저장할 수 없고,
 * 이미 직접 지정한 지금 집이면 바꿀 게 없어요. 자동으로 잡힌 지금 집은 고를 수 있어요(직접 지정으로 바뀌어요).
 *
 * @param {HomeCandidate | null | undefined} candidate
 * @param {boolean} isPinned journey.home.source === 'user'
 * @returns {boolean}
 */
export function canSetHome(candidate, isPinned) {
  if (!candidate?.photoId) return false;
  return !(candidate.isCurrent && isPinned);
}

/**
 * 확정 줄 왼쪽의 안내 문구예요. 글과 사진은 건드리지 않고 무슨 일이 생기는지만 알려요.
 *
 * @param {HomeCandidate | null | undefined} candidate 고른 줄
 * @param {boolean} isPinned journey.home.source === 'user'
 * @returns {string}
 */
export function getHomeGuide(candidate, isPinned) {
  // 직접 지정한 지금 집은 고쳐 저장할 수 없어서 아무것도 안 고른 것과 같은 안내예요.
  if (!candidate || (candidate.isCurrent && isPinned)) return HOME_GUIDE_EMPTY;
  if (candidate.isCurrent) {
    return `${withObjectJosa(candidate.city)} 집으로 직접 지정해요. 여행 사이에 집에 다녀온 것으로 동선을 그려요.`;
  }
  return `${withTopicJosa(candidate.city)} 집이 되어 여행 기록에서 빠져요. 그곳의 사진과 글은 보이지 않게 되고, 집을 다시 바꾸면 돌아와요.`;
}
