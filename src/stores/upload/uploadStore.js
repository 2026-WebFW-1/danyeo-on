import { create } from 'zustand';

import { resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_STATE = { files: [], photos: [], noPreviewCount: 0, isDone: false };
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
 * @property {(files: File[]) => Promise<void>} start 이전 작업을 비우고 한 장씩 줄여요
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

  reset: () => {
    jobId += 1;
    for (const photo of get().photos) {
      if (photo.src) URL.revokeObjectURL(photo.src);
    }
    set(INITIAL_STATE);
  },
}));
