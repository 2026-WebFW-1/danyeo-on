import { getEnglishCountryName } from '@/utils/countryNameEn';
import { formatDateRange } from '@/utils/formatDateRange';
import { formatInbound } from '@/utils/formatInbound';
import { formatNo } from '@/utils/formatNo';
import { calcDotSize, calcLineWidth } from '@/utils/lineScale';
import { findCoverIndex, selectStopPhotos } from '@/utils/selectStopPhotos';
import { getOneLiner, selectPostsOfStop, selectTripStops } from '@/utils/tripStops';

/**
 * 03 도시 블록 하나를 그리는 데 필요한 값을 한 곳에서 모아요. 화면(PlacesView)은 이걸 받아 그리기만 해요.
 *
 * @typedef {object} CityBlock
 * @property {import('@/types').Stop} stop
 * @property {string} no 여행 안에서의 순번. 예: '01'
 * @property {string | null} inboundLabel 들어오는 구간 글자. 예: '비행 · 3,250km'. 구간이 없으면 null
 * @property {number} lineWidth 들어오는 구간의 세로선 굵기(px)
 * @property {number} dotSize 점 지름(px)
 * @property {string} dateRange 예: '2025.01.03 — 03.05'
 * @property {string} startDate 예: '2025.01.03'. 접힌 지점 줄에 써요
 * @property {string} countryLabel 영어 나라 이름. 모르면 지점에 적힌 나라 이름
 * @property {import('@/types').Post[]} posts 이 지점의 글(날짜순)
 * @property {string | null} oneLiner 한 줄 글. 글이 없으면 null
 * @property {import('@/types').PhotoRef[]} photos 크게 볼 사진 목록
 * @property {number} coverIndex photos 중 대표 사진의 번호
 */

/**
 * 한 여행의 도시 블록들을 시간 순서로 만들어요. 경유 지점은 빠져요. 없는 여행이면 빈 배열이에요.
 *
 * @param {import('@/types').Journey | null | undefined} journey
 * @param {string} tripId
 * @param {import('@/types').Post[]} posts 로그인한 사람의 글 전부
 * @param {import('@/types').Photo[]} photos 로그인한 사람의 사진 전부
 * @returns {CityBlock[]}
 */
export function selectCityBlocks(journey, tripId, posts, photos) {
  return selectTripStops(journey, tripId).map(({ stop, inbound }, index) => {
    const stopPosts = selectPostsOfStop(journey, posts, stop.id);
    const stopPhotos = selectStopPhotos(stop, photos);

    return {
      stop,
      no: formatNo(index + 1),
      inboundLabel: inbound ? formatInbound(inbound) : null,
      lineWidth: calcLineWidth(inbound?.km),
      dotSize: calcDotSize(stop.days),
      dateRange: formatDateRange(stop.from, stop.to),
      startDate: formatDateRange(stop.from, stop.from),
      countryLabel: getEnglishCountryName(stop.cc) ?? stop.country,
      posts: stopPosts,
      oneLiner: getOneLiner(stopPosts),
      photos: stopPhotos,
      coverIndex: findCoverIndex(stopPhotos, stop.coverFileKey),
    };
  });
}
