import { toUploadedImagePaths } from '@/utils/photoFileKey';

import { getSupabase } from './getSupabase';

const PHOTO_BUCKET = 'photos';

/**
 * 로그인한 사람의 데이터(사진·보정·글)를 한 번에 가져와요.
 * buildJourney가 사진과 보정을 같이 쓰니, 따로 부르지 말고 이걸 한 번 받아서 나눠 써요.
 * 로그인하지 않았으면 Supabase가 거절해서 오류를 던져요.
 *
 * @returns {Promise<import('@/types').MyData>}
 */
export async function getMyData() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('my_data');
  if (error) throw error;
  return data;
}

/**
 * 사진 정보를 저장해요. 이미 올린 사진(같은 파일 이름, 촬영 시각)을 건너뛰어요
 * ownerId, uploadedAt, timeUncertain은 서버가 정해서 넘기지 않습니다.
 * @param {Omit<import('@/types').Photo, 'ownerId' | 'uploadedAt' | 'timeUncertain'>[]} photos
 * @returns {Promise<import('@/types').SavePhotosResult>}
 */
export async function savePhotos(photos) {
  if (photos.length === 0)
    return {
      saved: [],
      skipped: [],
    };

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('save_photos', {
    photos,
  });
  if (error) throw error;

  // save_photos는 새로 넣은 ID만 돌려줘서, 넘긴 ID중 거기 없는 것이 건너뛴 사진입니다.
  const savedIds = new Set(data);
  const ids = photos.map((photo) => photo.id);

  return {
    saved: ids.filter((id) => savedIds.has(id)),
    skipped: ids.filter((id) => !savedIds.has(id)),
  };
}

/**
 * 사진을 지워요. 없는 사진이나 남의 사진은 오류 없이 빠지니, 돌려받은 ID로 확인해요.
 * 직접 올린 사진은 photos 버킷의 이미지도 같이 지워요. 데모 사진의 이미지는 공용이라 두어요.
 *
 * @param {string[]} ids
 * @returns {Promise<string[]>} 실제로 지운 사진 ID
 */
export async function deletePhotos(ids) {
  if (ids.length === 0) return [];

  const supabase = await getSupabase();

  // RLS에 막히면 오류 대신 0행이 지워져서, select로 지운 행을 돌려받아 확인합니다.
  const { data, error } = await supabase
    .from('photos')
    .delete()
    .in('id', ids)
    .select('id, file_key');
  if (error) throw error;

  const imagePaths = data.flatMap((row) => {
    const paths = toUploadedImagePaths(row.file_key);
    return paths ? [paths.full, paths.thumb] : [];
  });
  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(imagePaths);
    // 사진 행은 이미 지워졌어요. 남은 파일은 어느 화면도 가리키지 않으니, 던져서 삭제가 실패한 것처럼 보이게 하지 않아요.
    if (storageError) console.error(storageError);
  }

  return data.map((row) => row.id);
}

/**
 * 사진 이미지 두 벌(보기용·썸네일)을 photos 버킷에 올려요.
 * 같은 경로에 덮어써서, 실패한 뒤 다시 불러도 결과가 같아요.
 *
 * @param {string} fileKey toUploadedFileKey로 만든 키. 저장한(saved) 사진의 것만 넘겨요
 * @param {{ full: Blob, thumb: Blob }} images
 * @returns {Promise<void>}
 */
export async function savePhotoImage(fileKey, images) {
  const paths = toUploadedImagePaths(fileKey);
  if (!paths) throw new Error(`올린 사진의 fileKey가 아니에요: ${fileKey}`);

  const supabase = await getSupabase();
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const results = await Promise.all(
    ['full', 'thumb'].map((size) =>
      bucket.upload(paths[size], images[size], { upsert: true, contentType: images[size].type }),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

// 비공개 버킷이라 주소에 기한이 있어요. 한 화면을 보는 동안은 넉넉하게 한 시간으로 잡았어요.
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * 올린 사진 이미지를 img src로 쓸 수 있는 서명 주소로 바꿔요.
 *
 * @param {string} fileKey toUploadedFileKey로 만든 키
 * @param {'full' | 'thumb'} size
 * @returns {Promise<string>} 아직 올리지 않은 이미지면 오류를 던져요
 */
export async function getPhotoImageUrl(fileKey, size) {
  const paths = toUploadedImagePaths(fileKey);
  if (!paths) throw new Error(`올린 사진의 fileKey가 아니에요: ${fileKey}`);

  const supabase = await getSupabase();
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(paths[size], SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
