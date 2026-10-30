// 사진 파일 안의 메타데이터를 읽는 라이브러리입니다.
// * 메타데이터: EXIF(촬영 시각, 카메라 설정)와 GPS, XMP, IPTC(편집 프로그램이 넣는 정보)등이 존재.
import exifr from 'exifr'; // v7.1.3

// 필요한 태그들이고 나머지는 파싱하지 않을 예정입니다.
const TAGS = [
  'DateTimeOriginal',
  'OffsetTimeOriginal',
  'GPSLatitude',
  'GPSLatitudeRef',
  'GPSLongitude',
  'GPSLongitudeRef',
  'Make',
  'Model',
  'FocalLength',
  'FocalLengthIn35mmFormat',
  'FNumber',
  'ExposureTime',
  'ISO',
];

// '2024:11:24 08:30:49' 처럼 연:월:일 시:분:초. 괄호로 묶은 여섯 칸을 꺼내 씁니다.
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
// '+09:00', '-07:00' 처럼 부호 + 시 두 자리 + : + 분 두 자리
const OFFSET = /^[+-]\d{2}:\d{2}$/;

// 읽지 못한 파일. 받는 쪽이 키를 따로 확인하지 않도록 성공했을 때와 같은 모양으로 둡니다.
const UNREADABLE = {
  readable: false,
  takenAt: null,
  offset: null,
  timeUncertain: true,
  lat: null,
  lng: null,
  camera: null,
};

/**
 * <p>사진 파일에서 촬영 시각·위치·카메라 정보를 읽어 seed의 photos 모양으로 돌려줍니다.
 * <p>줄이면 EXIF가 사라지므로 resizePhoto보다 먼저, 원본 파일로 불러야 합니다.
 *
 * <p>readable은 파일 자체를 읽을 수 있는지입니다. EXIF가 없는 사진(메신저, 캡처)은 true에 값만 null입니다.
 * @param {File | Blob} file
 * @returns {Promise<{ readable, takenAt, offset, timeUncertain, lat, lng, camera }>}
 * <p>readable: boolean
 * <p>takenAt: string | null. 현지 시각, 시간대 없음. 예: '2024-11-24T08:30:49'
 * <p>offset: string | null. 예: '+09:00'
 * <p>timeUncertain: boolean. offset이 없으면 true
 * <p>lat, lng: number | null
 * <p>camera: toCamera 결과 | null
 */
export async function readExif(file) {
  let tags;

  try {
    // reviveValues: false: 날짜를 Date로 바꾸면 브라우저 시간대가 섞이므로 문자열 그대로 받습니다.
    // chunked: false: 나눠 읽으면 잘린 파일도 앞부분만 읽고 errors 없이 넘어가서, 통째로 읽습니다.
    tags = await exifr.parse(file, {
      pick: TAGS,
      reviveValues: false,
      translateValues: false, // 회전 태그 같은 값을 숫자로
      chunked: false,
    });
  } catch {
    // 이미지가 아닌 파일은 여기서 던집니다.
    return { ...UNREADABLE };
  }

  // 잘린 파일은 던지지 않고 errors만 돌려줍니다.
  if (tags?.errors?.length) {
    return { ...UNREADABLE };
  }

  // {
  //   readable: true,
  //   takenAt: '2024-11-24T08:30:49',
  //   offset: '+09:00',
  //   timeUncertain: false,
  //   lat: 34.9949,
  //   lng: 135.785,
  //   camera: {...}
  // }
  return { readable: true, ...toPhoto(tags ?? {}) };
}

/**
 * <p>exifr가 읽은 태그를 seed의 photos 모양으로 바꿉니다.
 *
 * @param {object} tags exifr.parse 결과. EXIF가 없으면 빈 객체
 * @returns {{ takenAt, offset, timeUncertain, lat, lng, camera }}
 * <p>
 * <p>readExif 결과에서 readable만 뺀 모양입니다. readable은 readExif가 붙입니다.
 */
function toPhoto(tags) {
  // 촬영일만 씁니다. 수정일(ModifyDate)은 편집하거나 받은 날일 수 있습니다.
  const takenAt = toLocalTime(tags.DateTimeOriginal);
  const offset = takenAt && OFFSET.test(tags.OffsetTimeOriginal) ? tags.OffsetTimeOriginal : null;
  const { lat, lng } = toLatLng(tags.latitude, tags.longitude);

  return {
    takenAt,
    offset,
    timeUncertain: offset === null,
    lat,
    lng,
    camera: toCamera(tags),
  };
}

/**
 * @param {string | undefined} value 예: '2024:11:24 08:30:49'
 * @returns {string | null} 예: '2024-11-24T08:30:49'
 */
function toLocalTime(value) {
  const match = EXIF_DATE.exec(value ?? '');
  // match = [
  //   '2024:11:24 08:30:49', // [0] 패턴에 맞은 문자열 전체
  //   '2024', // [1] 첫 번째 괄호
  //   '11', // [2]
  //   '24', // [3]
  //   '08', // [4]
  //   '30', // [5]
  //   '49', // [6] 여섯 번째 괄호
  // ];

  // 시계가 설정되지 않은 카메라는 0000:00:00을 적습니다.
  if (!match || match[1] === '0000') {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * <p>위치를 못 믿을 값이면 둘 다 null로 돌려줍니다.
 *
 * @param {number | undefined} lat exifr가 도·분·초에서 계산한 위도. 예: 34.9949
 * @param {number | undefined} lng 경도. 예: 135.785
 * @returns {{ lat: number | null, lng: number | null }}
 */
function toLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null };
  }

  // 0,0은 GPS가 위치를 못 잡았을 때 적히는 값이라 위치 없음으로 봅니다.
  if (lat === 0 && lng === 0) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

/**
 * <p>제조사와 모델이 둘 다 없으면 카메라 정보가 없는 것으로 봅니다.
 *
 * @param {object} tags exifr.parse 결과
 * @returns {{ make, model, focal, aperture, shutter, iso } | null}
 * <p>
 * <p>make: string | null. 예: 'Apple'
 * <p>model: string | null. 예: 'iPhone 13'
 * <p>focal: number | null. 35mm 환산 초점거리(mm), 없으면 실제 초점거리
 * <p>aperture: number | null. 조리개(F값). 예: 1.6
 * <p>shutter: number | null. 셔터 속도(초). 예: 0.00833
 * <p>iso: number | null. 감도. 예: 80
 */
function toCamera(tags) {
  const make = tags.Make?.trim() || null;
  const model = tags.Model?.trim() || null;
  if (!make && !model) {
    return null;
  }

  return {
    make,
    model,
    // 폰마다 실제 초점거리가 달라서 비교할 수 있는 35mm 환산값을 먼저 씁니다.
    focal: tags.FocalLengthIn35mmFormat ?? tags.FocalLength ?? null,
    aperture: tags.FNumber ?? null,
    shutter: tags.ExposureTime ?? null,
    iso: tags.ISO ?? null,
  };
}
