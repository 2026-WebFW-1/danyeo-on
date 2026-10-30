// 여러 파일이 같이 쓰는 데이터의 모양을 JSDoc @typedef로 적어 둔 곳이에요.
// 모양의 기준은 src/data/README.md의 fixtures(<인물>.journey.json)예요.
// 다른 파일에선 `@param {import('@/types').Journey} journey`처럼 불러다 써요.

/**
 * 머문 곳 하나. 집은 들어 있지 않아요.
 *
 * @typedef {object} Stop
 * @property {string} id 이 지점의 첫 사진 ID
 * @property {string} tripId 속한 여행 ID
 * @property {number} lat
 * @property {number} lng
 * @property {string} city 도시 이름. 예: '밴쿠버'
 * @property {string} country 나라 이름. 예: '캐나다'
 * @property {string} cc 나라 코드. 예: 'CA'
 * @property {string} from 처음 찍은 시각(시간대 포함). 예: '2025-06-28T18:30:51-07:00'
 * @property {string} to 마지막으로 찍은 시각(시간대 포함)
 * @property {number} days 머문 날 수
 * @property {boolean} chapter 14일 이상 머물렀으면 true(챕터)
 * @property {string | null} slug 챕터 주소 조각. 챕터가 아니면 null. 예: '밴쿠버-2025'
 * @property {boolean} transit 경유지면 true. 선·통계에서 빠져요
 * @property {string[]} photoIds
 * @property {number} photoCount
 * @property {string | null} coverFileKey 대표 사진. 예: 'public:/photos/tokyo-1.webp'
 */

/**
 * 좌표로 찾은 장소 이름이에요. `Stop`의 이름 칸(`city`, `country`, `cc`)만 뽑은 모양이고, `reverseCity`가 돌려줘요.
 *
 * @typedef {Pick<Stop, 'city' | 'country' | 'cc'>} Place
 */

/**
 * 지점과 지점 사이의 이동 구간 하나.
 *
 * @typedef {object} Leg
 * @property {string} id 계산할 때마다 새로 매겨져요. 예: 'leg_1'
 * @property {string | null} tripId 집을 안 들르고 다음 여행으로 가는 구간(gap)이면 null
 * @property {'outbound' | 'between' | 'gap' | 'return'} kind 집→첫 지점 | 여행 안 | 집 안 들르고 다음 여행 | →집
 * @property {string} from 'home' 또는 지점 ID
 * @property {string} to 'home' 또는 지점 ID
 * @property {[number, number]} fromLatLng
 * @property {[number, number]} toLatLng
 * @property {string} departAt 출발 시각(시간대 포함)
 * @property {string} arriveAt 도착 시각(시간대 포함)
 * @property {number} hours
 * @property {'photos' | 'estimated'} timing 사진 시각 | 거리로 추정
 * @property {number} km
 * @property {'flight' | 'train' | 'car'} mode
 * @property {'auto' | 'user'} modeSource
 * @property {boolean} crossesAntimeridian 날짜변경선을 넘는 구간이면 true
 */

/**
 * 여행 하나. 지점과 구간은 ID로 가리켜요.
 *
 * @typedef {object} Trip
 * @property {string} id 이 여행의 첫 사진 ID
 * @property {string} name 예: '방콕 · 다낭'
 * @property {'auto' | 'user'} nameSource
 * @property {string} from 시작 시각(시간대 포함)
 * @property {string} to 끝 시각(시간대 포함)
 * @property {number} days
 * @property {string[]} stopIds
 * @property {string[]} legIds
 * @property {boolean} chapter 챕터 지점이 하나라도 있으면 true
 */

/**
 * 사진과 보정으로 계산한, 화면이 받는 여행 기록 전체.
 * 여행이 0개면 배열은 전부 비고 home·periods는 null이에요.
 *
 * @typedef {object} Journey
 * @property {{ lat: number, lng: number, city: string } | null} home
 * @property {Stop[]} stops
 * @property {Leg[]} legs
 * @property {Trip[]} trips
 * @property {string[]} unlocated 위치가 없어 지점에 못 넣은 사진 ID
 * @property {string[]} excluded 사용자가 뺀 사진 ID
 * @property {{ anchor: string, '1y': { from: string, to: string }, '2y': { from: string, to: string }, all: { from: string, to: string } } | null} periods
 */

/**
 * 한 여행을 목록(03 전체 기록의 탭 줄 등)에 보여 줄 때 필요한 값이에요.
 *
 * @typedef {object} TripListItem
 * @property {string} id 여행 ID
 * @property {string} no 목록 번호. 예: '01', '14'
 * @property {string} name 여행 이름. 예: '방콕 · 다낭'
 * @property {string} from 시작 날짜. 예: '2024-07-11'
 * @property {string} to 끝 날짜. 예: '2024-07-16'
 * @property {number} days
 * @property {boolean} chapter 챕터 지점이 있는 여행이면 true
 */

/**
 * 한 여행의 요약 숫자(StatRow에 들어가는 값)예요.
 *
 * @typedef {object} TripStats
 * @property {number} days 여행 일수
 * @property {number} cities 도시 수. 경유 지점은 안 세고, 이름이 같아도 나라가 다르면 따로 세요
 * @property {number} km 이동 거리 합. 집을 안 들르고 앞 여행에서 바로 온 구간(gap)도 넣고, 반올림한 정수예요
 * @property {number} photos 사진 수. 경유 지점의 사진은 빼요
 */

/**
 * 전체 여행을 한꺼번에 센 합계예요. 03 머리말과 00 홈의 통계 줄이 같은 값을 써요.
 *
 * @typedef {object} JourneyTotals
 * @property {number} stops 지점 수. 경유 지점은 빼요
 * @property {number} trips 여행 수
 * @property {number} cities 도시 수. 같은 도시에 여러 번 가도 한 번만 세요
 * @property {number} countries 나라 수
 * @property {number} km 이동 거리 합. 집을 안 들르고 가는 구간(gap)까지 모든 구간을 더하고, 반올림한 정수예요
 * @property {number} photos 사진 수. 경유 지점의 사진은 빼요
 * @property {number} flights 비행기로 이동한 구간 수
 * @property {{ year: number, month: number } | null} firstTripStart 첫 여행을 시작한 연·월. 여행이 없으면 null
 */

/**
 * 02 챕터 화면 머리의 `03 / 12`에 쓰는 챕터 하나예요.
 *
 * @typedef {object} ChapterItem
 * @property {Stop} stop 챕터 지점
 * @property {string} no 챕터 순번. 예: '03'
 * @property {string} total 전체 챕터 수. 예: '12'
 */

/**
 * 지점으로 들어오는 이동 구간이에요. 03 도시 블록 위의 "서울에서 · 3,717km" 한 줄에 쓰는 값이에요.
 *
 * @typedef {object} StopInbound
 * @property {string} fromName 어디서 오는지. 집에서 오면 집의 도시 이름, 아니면 앞 지점의 도시 이름
 * @property {number} km
 * @property {'flight' | 'train' | 'car'} mode
 */

/**
 * 03 도시 블록 하나에 쓰는 지점이에요. days·photoCount·coverFileKey 같은 값은 stop에서 그대로 써요.
 *
 * @typedef {object} TripStopItem
 * @property {Stop} stop
 * @property {StopInbound | null} inbound 들어오는 구간이 없으면 null
 */

/**
 * 하루에 하나 쓰는 글. 현지 날짜(`date`)에 붙어요.
 *
 * @typedef {object} Post
 * @property {string} id
 * @property {string} ownerId
 * @property {string} date 예: '2025-01-12'
 * @property {string} title
 * @property {string} body
 * @property {string[]} tags
 * @property {string[]} photoIds
 * @property {string} updatedAt
 */

/**
 * 사진 한 장을 화면에 보여 줄 때 필요한 값이에요(PhotoGrid, Lightbox).
 * seed의 photos 한 줄에서 이 둘만 있으면 돼요.
 *
 * @typedef {object} PhotoRef
 * @property {string} id
 * @property {string | null} fileKey 이미지가 없는 사진이면 null이에요(회색 칸으로 그려요)
 */

/**
 * 사진 올리기에서 고른 사진을 썸네일로 줄인 한 장이에요(usePhotoThumbnails, PhotoPile).
 * 아직 저장 전이라 브라우저 메모리에만 있어요.
 *
 * @typedef {object} PilePhoto
 * @property {string} id 고른 순서와 파일 이름으로 만든 값이에요. 예: '3-IMG_0214.jpg'
 * @property {string} filename 원본 파일 이름이에요. 예: 'IMG_0214.jpg'
 * @property {string} src 썸네일의 blob: 주소예요. 화면이 사라지면 해제돼요
 */

// 값을 내보내는 게 없어도 import('@/types')로 불러올 수 있게 모듈로 만들어요.
export {};
