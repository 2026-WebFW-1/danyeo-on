import exifr from 'exifr';

/** @typedef {Pick<import('@/types').PilePhoto, 'takenAt' | 'offset' | 'timeUncertain' | 'lat' | 'lng' | 'camera'>} PhotoMetadata */

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
 * 썸네일에는 EXIF가 남지 않으므로 원본에서 촬영 정보를 읽어요.
 * @param {File | Blob} file 원본 사진
 * @returns {Promise<PhotoMetadata & { readable: boolean }>} EXIF가 없는 사진도 읽을 수 있으면 readable은 true예요.
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

  return { readable: true, ...toPhotoMetadata(tags ?? {}) };
}

/**
 * @param {object} tags exifr.parse 결과. EXIF가 없으면 빈 객체
 * @returns {PhotoMetadata}
 */
function toPhotoMetadata(tags) {
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
