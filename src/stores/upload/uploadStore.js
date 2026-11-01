import { create } from 'zustand';

import { IMAGE_UPLOAD_CONCURRENCY, IMAGE_UPLOAD_RETRY_DELAYS_MS } from '@/constants/upload';
import { savePhotoImage } from '@/services/photoService';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_IMAGE_UPLOAD = { total: 0, uploaded: 0, skipped: 0, failed: 0 };
const INITIAL_STATE = {
  files: [],
  photos: [],
  noPreviewCount: 0,
  isDone: false,
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
 * @property {{ total: number, uploaded: number, skipped: number, failed: number }} imageUpload 이미지 올리기 진행 상태.
 *   skipped는 브라우저가 못 여는 사진(HEIC 등)이라 회색 칸으로 두는 것, failed는 다시 시도해도 못 올린 것이에요
 * @property {(files: File[]) => Promise<void>} start 이전 작업을 비우고 한 장씩 줄여요
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

  uploadImages: async (targets) => {
    const currentJob = jobId;
    const queue = [...targets];
    set({ imageUpload: { ...INITIAL_IMAGE_UPLOAD, total: targets.length } });

    const work = async () => {
      while (queue.length > 0 && currentJob === jobId) {
        const result = await uploadImage(queue.shift(), get);
        if (currentJob !== jobId) return;
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
 * 한 장을 올려요. 썸네일은 쌓을 때 만든 것을 그대로 쓰고 보기용만 새로 만들어요.
 * @param {{ order: number, fileKey: string }} target
 * @param {() => UploadState} get
 * @returns {Promise<'uploaded' | 'skipped' | 'failed'>}
 */
async function uploadImage({ order, fileKey }, get) {
  const file = get().files[order];
  const pilePhoto = get().photos.find((photo) => photo.order === order);
  // 아직 쌓이지 않은 장이면 썸네일을 여기서 만들어요. 쌓인 장의 thumb가 null이면 브라우저가 못 여는 사진이에요.
  const thumb = pilePhoto ? pilePhoto.thumb : await resizeThumbnail(file);
  const full = thumb && (await resizeFull(file));
  if (!full) return 'skipped';

  for (let attempt = 0; ; attempt += 1) {
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
