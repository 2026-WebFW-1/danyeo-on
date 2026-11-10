import { create } from 'zustand';

import { IMAGE_UPLOAD_CONCURRENCY, IMAGE_UPLOAD_RETRY_DELAYS_MS } from '@/constants/upload';
import {
  getMyData,
  getUploadedImagePaths,
  savePhotoImage,
  savePhotos,
} from '@/services/photoService';
import { createPhotoId, toUploadedFileKey, toUploadedImagePaths } from '@/utils/photoFileKey';
import { toDedupeKey } from '@/utils/upload/dedupeKey';
import { readPhotos } from '@/utils/upload/readPhotos';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_IMAGE_UPLOAD = { total: 0, uploaded: 0, skipped: 0, failed: 0 };
const INITIAL_STATE = {
  files: [],
  photos: [],
  noPreviewCount: 0,
  isDone: false,
  saveStatus: 'idle',
  saveResult: null,
  imageUpload: INITIAL_IMAGE_UPLOAD,
};
// 기다리는 사이 번호가 바뀌었으면 그 작업은 취소된 거예요.
// 화면에 쓰지 않는 값이라 상태에 두지 않았어요.
let jobId = 0; // 가장 최근에 시작한 작업의 번호

/**
 * 업로드부터 전체 기록까지 같은 원본·썸네일을 유지해요.
 * #26의 이미지 업로드 진행 상태도 이 스토어에 두고, photos의 thumb를 재사용해요.
 *
 * @typedef {object} UploadState
 * @property {File[]} files 고른 원본. 정보 읽기와 보기용 이미지 생성에 써요
 * @property {import('@/types').PilePhoto[]} photos 준비된 순서대로 쌓인 사진
 * @property {number} noPreviewCount 미리 볼 수 없는 사진 수
 * @property {boolean} isDone
 * @property {'idle' | 'saving' | 'saved' | 'failed'} saveStatus 사진 정보 저장 상태
 * @property {{ saved: number, existing: number } | null} saveResult 저장한 뒤의 수.
 *   existing은 전에 저장해서 건너뛴 사진이에요
 * @property {{ total: number, uploaded: number, skipped: number, failed: number }} imageUpload 이미지 올리기 진행 상태.
 *   skipped는 브라우저가 못 여는 사진(HEIC 등)이라 회색 칸으로 두는 것, failed는 다시 시도해도 못 올린 것이에요
 * @property {(files: File[]) => Promise<void>} start 이전 작업을 비우고 한 장씩 줄여요
 * @property {(ownerId: string) => Promise<void>} save 촬영 정보를 읽어 저장하고, 이미지 올리기를 뒤에서 시작해요.
 *   다시 불러도 이미 저장한 사진은 두 벌이 되지 않아요. 창을 닫아 이미지가 다 못 올라간 사진은 이때 이어서 올려요
 * @property {(targets: { order: number, fileKey: string }[]) => Promise<void>} uploadImages
 *   저장한(saved) 사진의 이미지를 동시에 3장씩 올려요. order는 고른 순서, fileKey는 저장할 때 정한 키예요
 * @property {() => void} reset 작업을 중단하고 이미지 주소와 파일을 놓아줘요
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UploadState>>} */
export const useUploadStore = create((set, get) => ({
  ...INITIAL_STATE,

  start: async (files) => {
    get().reset();
    const currentJob = jobId; // 자기 작업 번호의 사본으로 저장합니다.
    const selectedFiles = [...files];
    set({ files: selectedFiles });

    // 큰 원본 여러 장을 동시에 디코딩하면 메모리가 급증하므로 한 장씩 처리해요.
    for (const [order, file] of selectedFiles.entries()) {
      const thumb = await resizeThumbnail(file);
      // 디코딩은 도중에 멈출 수 없어서, 끝난 뒤 그사이 reset됐는지 봐요.
      // blob 주소를 만들기 전에 봐야 아무도 해제하지 않는 주소가 생기지 않아요.
      if (currentJob !== jobId) return;

      const photo = {
        id: `${order}-${file.name}`,
        order,
        filename: file.name,
        thumb,
        src: thumb ? URL.createObjectURL(thumb) : null,
      };
      set((state) => ({
        photos: [...state.photos, photo],
        noPreviewCount: state.noPreviewCount + (photo.src ? 0 : 1),
      }));
      // set을 받은 구독자가 곧바로 reset할 수도 있어서, 다음 장을 열기 전에 한 번 더 봐요.
      if (currentJob !== jobId) return;
    }
    set({ isDone: true });
  },

  save: async (ownerId) => {
    const currentJob = jobId;
    const isCancelled = () => currentJob !== jobId;
    set({ saveStatus: 'saving' });

    let saved;
    try {
      saved = await savePicked(ownerId, get(), isCancelled);
    } catch (error) {
      if (isCancelled()) return;
      console.error(error);
      set({ saveStatus: 'failed' });
      return;
    }
    if (isCancelled()) return;

    const { targets, ...saveResult } = saved;
    set({ saveStatus: 'saved', saveResult });
    void get().uploadImages(targets);
  },

  uploadImages: async (targets) => {
    const currentJob = jobId;
    const isCancelled = () => currentJob !== jobId;
    const queue = [...targets];
    set({ imageUpload: { ...INITIAL_IMAGE_UPLOAD, total: targets.length } });

    const work = async () => {
      while (queue.length > 0 && !isCancelled()) {
        const result = await uploadImage(queue.shift(), get, isCancelled);
        if (isCancelled()) return;
        set((state) => ({
          imageUpload: { ...state.imageUpload, [result]: state.imageUpload[result] + 1 },
        }));
      }
    };
    await Promise.all(Array.from({ length: IMAGE_UPLOAD_CONCURRENCY }, work));
  },

  reset: () => {
    jobId += 1;
    for (const photo of get().photos) {
      if (photo.src) URL.revokeObjectURL(photo.src);
    }
    set(INITIAL_STATE);
  },
}));

/**
 * 고른 사진의 촬영 정보를 읽어 저장하고, 이미지를 올릴 대상을 골라요.
 * 새로 저장한 사진에 더해, 전에 저장했지만 창을 닫아 이미지가 다 못 올라간 사진도 이어서 올려요.
 * 미리 볼 수 없는 사진(HEIC 등)은 이미지를 못 만들어서 fileKey 없이 저장해요(회색 칸).
 *
 * @param {string} ownerId
 * @param {UploadState} state
 * @param {() => boolean} isCancelled 그사이 reset됐는지예요
 * @returns {Promise<{ saved: number, existing: number, targets: { order: number, fileKey: string }[] } | null>}
 *   기다리는 사이 reset됐으면 null
 */
async function savePicked(ownerId, { files, photos }, isCancelled) {
  const { photos: readResults } = await readPhotos(files);
  // 저장하면 이미지 없는 행이 남고, 같은 사진을 다시 저장해도 이미 있다며 건너뛰어서 회색 칸이 돼요.
  if (isCancelled()) return null;

  const hasImage = new Set(photos.filter((photo) => photo.thumb).map((photo) => photo.order));
  const rows = readResults.map(
    ({ order, dedupeKey, fileName, takenAt, offset, lat, lng, camera }) => {
      const id = createPhotoId();
      const fileKey = hasImage.has(order) ? toUploadedFileKey(ownerId, id) : null;
      return {
        order,
        dedupeKey,
        photo: { id, fileName, takenAt, offset, lat, lng, camera, fileKey },
      };
    },
  );

  const { saved, skipped } = await savePhotos(rows.map((row) => row.photo));
  const savedIds = new Set(saved);
  const newTargets = rows
    .filter((row) => savedIds.has(row.photo.id) && row.photo.fileKey)
    .map((row) => ({ order: row.order, fileKey: row.photo.fileKey }));

  // 이번 파일로 이미지를 만들 수 있는 사진만 이어 올릴 수 있어요.
  const skippedRows = rows.filter((row) => !savedIds.has(row.photo.id) && hasImage.has(row.order));
  const resumeTargets = skippedRows.length > 0 ? await findUnfinished(ownerId, skippedRows) : [];
  if (isCancelled()) return null;

  return {
    saved: saved.length,
    existing: skipped.length,
    targets: [...newTargets, ...resumeTargets],
  };
}

/**
 * 이미 저장돼 있던 사진 중 이미지가 다 올라가지 않은 것을 찾아, 원래 fileKey로 다시 올릴 대상을 만들어요.
 * 이번에 만든 ID·fileKey는 저장되지 않았으니, 같은 사진(촬영 시각, 파일 이름)의 원래 행을 찾아 그 키를 써요.
 *
 * @param {string} ownerId
 * @param {{ order: number, dedupeKey: string }[]} skippedRows 저장 때 건너뛴 사진
 * @returns {Promise<{ order: number, fileKey: string }[]>}
 */
async function findUnfinished(ownerId, skippedRows) {
  const [{ photos: savedPhotos }, uploadedPaths] = await Promise.all([
    getMyData(),
    getUploadedImagePaths(ownerId),
  ]);
  const fileKeyByDedupeKey = new Map(
    savedPhotos.map((photo) => [toDedupeKey(photo.fileName, photo.takenAt), photo.fileKey]),
  );

  return skippedRows.flatMap(({ order, dedupeKey }) => {
    const fileKey = fileKeyByDedupeKey.get(dedupeKey);
    // 이미지 없이 저장한 사진(null)이나 데모 사진은 올릴 곳이 없어요.
    const paths = toUploadedImagePaths(fileKey);
    if (!paths) return [];

    // 보기용·썸네일은 따로 올라가서, 둘 다 있어야 다 올라간 거예요.
    const isUploaded = uploadedPaths.has(paths.full) && uploadedPaths.has(paths.thumb);
    return isUploaded ? [] : [{ order, fileKey }];
  });
}

/**
 * 한 장을 올려요. 썸네일은 쌓을 때 만든 것을 그대로 쓰고 보기용만 새로 만들어요.
 * @param {{ order: number, fileKey: string }} target
 * @param {() => UploadState} get
 * @param {() => boolean} isCancelled 그사이 reset됐는지예요
 * @returns {Promise<'uploaded' | 'skipped' | 'failed' | 'cancelled'>} cancelled는 세지 않아요
 */
async function uploadImage({ order, fileKey }, get, isCancelled) {
  const file = get().files[order];
  const pilePhoto = get().photos.find((photo) => photo.order === order);
  // 아직 쌓이지 않은 장이면 썸네일을 여기서 만들어요. 쌓인 장의 thumb가 null이면 브라우저가 못 여는 사진이에요.
  const thumb = pilePhoto ? pilePhoto.thumb : await resizeThumbnail(file);
  const full = thumb && (await resizeFull(file));
  if (!full) return 'skipped';

  for (let attempt = 0; ; attempt += 1) {
    // 보기용을 줄이거나 다시 시도를 기다리는 사이 reset됐으면 올리지 않아요.
    if (isCancelled()) return 'cancelled';
    try {
      await savePhotoImage(fileKey, { full, thumb });
      return 'uploaded';
    } catch (error) {
      if (attempt === IMAGE_UPLOAD_RETRY_DELAYS_MS.length) {
        console.error(error);
        return 'failed';
      }
      await wait(IMAGE_UPLOAD_RETRY_DELAYS_MS[attempt]);
    }
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
