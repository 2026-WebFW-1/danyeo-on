import { create } from 'zustand';

import { IMAGE_UPLOAD_CONCURRENCY, IMAGE_UPLOAD_RETRY_DELAYS_MS } from '@/constants/upload';
import { refreshJourney } from '@/services/journeyService';
import {
  getMyData,
  getUploadedImagePaths,
  savePhotoImage,
  savePhotos,
} from '@/services/photoService';
import { createPhotoId, toUploadedFileKey, toUploadedImagePaths } from '@/utils/photoFileKey';
import { findFirstTripOfPhotos } from '@/utils/tripPager';
import { toDedupeKey } from '@/utils/upload/dedupeKey';
import { readExif } from '@/utils/upload/readExif';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_IMAGE_UPLOAD = { total: 0, uploaded: 0, skipped: 0, failed: 0 };
const INITIAL_STATE = {
  files: [],
  skippedFiles: [],
  photos: [],
  noPreviewCount: 0,
  isDone: false,
  saveStatus: 'idle',
  saveTarget: 'trip',
  saveResult: null,
  newPhotoIds: [],
  imageUpload: INITIAL_IMAGE_UPLOAD,
  journeyStatus: 'idle',
  newTripId: null,
  passAnswers: {},
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
 * @property {import('@/types').SkippedFile[]} skippedFiles 고를 때 이름으로 뺀 파일(U109).
 *   페이지를 나갔다 와도 모으기 화면이 files와 같이 다시 보여 줘야 해서 스토어에 둬요
 * @property {import('@/types').PilePhoto[]} photos 준비된 순서대로 쌓인 사진
 * @property {number} noPreviewCount 미리 볼 수 없는 사진 수
 * @property {boolean} isDone
 * @property {'idle' | 'saving' | 'saved' | 'failed'} saveStatus 사진 정보 저장 상태
 * @property {'trip' | 'sort'} saveTarget 다 끝나면 갈 곳. 'trip'은 [여행 보기](03), 'sort'는 [사진 정리하기](07 위치 확인 필요)예요.
 *   저장이 끝나기 전에 페이지를 나갔다 와도 고른 곳으로 가게 저장 상태와 같이 스토어에 둬요
 * @property {{ saved: number, existing: number, unreadable: number } | null} saveResult 저장한 뒤의 수.
 *   existing은 전에 저장해서 건너뛴 사진, unreadable은 열어 보니 사진이 아니라 저장하지 않은 파일이에요
 * @property {string[]} newPhotoIds 이번 save에서 새로 저장한 사진 id예요. 이미 있던 사진은 빠져요.
 *   Journey를 다시 만들 때([다시 시도] 포함) 이 사진이 든 여행으로 넘어가려고 스토어에 둬요
 * @property {{ total: number, uploaded: number, skipped: number, failed: number }} imageUpload 이미지 올리기 진행 상태.
 *   skipped는 브라우저가 못 여는 사진(HEIC 등)이라 회색 칸으로 두는 것, failed는 다시 시도해도 못 올린 것이에요
 * @property {(files: File[], skippedFiles?: import('@/types').SkippedFile[]) => Promise<void>} start
 *   이전 작업을 비우고 한 장씩 줄이며 촬영 정보를 읽어요. 고를 때 뺀 파일은 skippedFiles에 그대로 둬요
 * @property {(ownerId: string, target?: 'trip' | 'sort') => Promise<void>} save 쌓을 때 읽은 촬영 정보로 저장하고,
 *   이미지 올리기를 뒤에서 시작해요. target은 saveTarget에 둬요(없으면 'trip').
 *   다시 불러도 이미 저장한 사진은 두 벌이 되지 않아요. 창을 닫아 이미지가 다 못 올라간 사진은 이때 이어서 올려요
 * @property {(targets: { order: number, fileKey: string }[]) => Promise<void>} uploadImages
 *   저장한(saved) 사진의 이미지를 동시에 3장씩 올려요. order는 고른 순서, fileKey는 저장할 때 정한 키예요
 * @property {'idle' | 'building' | 'saved' | 'failed'} journeyStatus 저장한 사진으로 Journey를 만들어 쓰는 상태(#144).
 *   사진 저장과 따로 둬서, 실패해도 사진은 저장된 채로 Journey만 다시 만들 수 있어요.
 *   페이지를 나갔다 와도 03으로 넘어갈 때를 알 수 있게 스토어에 둬요
 * @property {string | null} newTripId Journey를 만든 뒤 [여행 보기]가 열 여행 id예요(U106).
 *   새로 저장한 사진이 든 여행 중 가장 이른 것이고, 그런 여행이 없으면 null이에요
 * @property {(ownerId: string) => Promise<void>} refreshJourney 내 사진·보정 전체로 Journey를 다시 계산해 저장해요.
 *   save가 끝나면 이미지 올리기와 함께 시작하고, 실패하면 화면의 [다시 시도]가 다시 불러요.
 *   끝나면 newPhotoIds가 든 여행을 newTripId에 둬요
 * @property {Record<string, 'exclude' | 'later'>} passAnswers 지나가며 정리 끝에서 물어본 사진의 답(사진 id별).
 *   페이지를 나갔다 와도 다시 묻지 않게 스토어에 둬요. 'exclude'인 사진은 save가 저장하지 않아요
 * @property {(photoId: string, answer: 'exclude' | 'later') => void} answerPass
 * @property {() => void} stopCollecting 모으기를 멈추고 모은 장까지만 남겨요(U110).
 *   reset과 달리 사진과 이미지 주소는 그대로 둬서 [다음]으로 이어 갈 수 있어요
 * @property {() => void} reset 작업을 중단하고 이미지 주소와 파일을 놓아줘요
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UploadState>>} */
export const useUploadStore = create((set, get) => ({
  ...INITIAL_STATE,

  start: async (files, skippedFiles = []) => {
    get().reset();
    const currentJob = jobId; // 자기 작업 번호의 사본으로 저장합니다.
    const selectedFiles = [...files];
    set({ files: selectedFiles, skippedFiles });

    // 큰 원본 여러 장을 동시에 디코딩하면 메모리가 급증하므로 한 장씩 처리해요.
    for (const [order, file] of selectedFiles.entries()) {
      const thumb = await resizeThumbnail(file);
      // 줄인 썸네일에는 촬영 정보가 없어서 원본으로 읽어요.
      // 정리 화면이 물어볼 사진을 고를 때 필요해서, 저장 전인 여기서 읽어요(getPassKind).
      const exif = await readExif(file);
      // 디코딩은 도중에 멈출 수 없어서, 끝난 뒤 그사이 reset됐는지 봐요.
      // blob 주소를 만들기 전에 봐야 아무도 해제하지 않는 주소가 생기지 않아요.
      if (currentJob !== jobId) return;

      const photo = {
        id: `${order}-${file.name}`,
        order,
        filename: file.name,
        thumb,
        src: thumb ? URL.createObjectURL(thumb) : null,
        ...exif,
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

  save: async (ownerId, target = 'trip') => {
    const currentJob = jobId;
    const isCancelled = () => currentJob !== jobId;
    set({ saveStatus: 'saving', saveTarget: target });

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

    const { targets, newPhotoIds, ...saveResult } = saved;
    set({ saveStatus: 'saved', saveResult, newPhotoIds });
    void get().uploadImages(targets);
    // Journey는 사진 행만 있으면 계산할 수 있어서 이미지를 기다리지 않아요.
    // 도시 이름 찾기(1.1초 간격)와 이미지 올리기가 같이 돌아서 기다리는 시간이 겹쳐요.
    void get().refreshJourney(ownerId);
  },

  refreshJourney: async (ownerId) => {
    const currentJob = jobId;
    const isCancelled = () => currentJob !== jobId;
    set({ journeyStatus: 'building' });
    let journey;
    try {
      journey = await refreshJourney(ownerId);
    } catch (error) {
      if (isCancelled()) return;
      console.error(error);
      set({ journeyStatus: 'failed' });
      return;
    }
    if (isCancelled()) return;
    set({ journeyStatus: 'saved', newTripId: findFirstTripOfPhotos(journey, get().newPhotoIds) });
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

  answerPass: (photoId, answer) => {
    set((state) => ({ passAnswers: { ...state.passAnswers, [photoId]: answer } }));
  },

  stopCollecting: () => {
    const { isDone, photos } = get();
    // 다 모은 뒤에 번호를 올리면 진행 중인 저장·이미지 올리기까지 취소돼요.
    if (isDone || photos.length === 0) return;
    jobId += 1;
    set((state) => ({ files: state.files.slice(0, state.photos.length), isDone: true }));
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
 * 쌓을 때 읽은 촬영 정보로 고른 사진을 저장하고, 이미지를 올릴 대상을 골라요.
 * 열지 못한 파일과 정리 끝에서 빼 둔 사진은 저장하지 않아요.
 * 새로 저장한 사진에 더해, 전에 저장했지만 창을 닫아 이미지가 다 못 올라간 사진도 이어서 올려요.
 * 미리 볼 수 없는 사진(HEIC 등)은 이미지를 못 만들어서 fileKey 없이 저장해요(회색 칸).
 *
 * @param {string} ownerId
 * @param {UploadState} state
 * @param {() => boolean} isCancelled 그사이 reset됐는지예요
 * @returns {Promise<{
 *   saved: number,
 *   existing: number,
 *   unreadable: number,
 *   newPhotoIds: string[],
 *   targets: { order: number, fileKey: string }[],
 * } | null>}
 *   기다리는 사이 reset됐으면 null
 */
async function savePicked(ownerId, { photos, passAnswers }, isCancelled) {
  // 쌓을 때(start) 원본에서 읽어 둔 촬영 정보를 써서, 같은 파일을 다시 읽지 않아요.
  const picked = photos.filter((photo) => photo.readable && passAnswers[photo.id] !== 'exclude');
  const rows = picked.map(({ order, filename, thumb, takenAt, offset, lat, lng, camera }) => {
    const id = createPhotoId();
    const fileKey = thumb ? toUploadedFileKey(ownerId, id) : null;
    return {
      order,
      dedupeKey: toDedupeKey(filename, takenAt),
      photo: {
        id,
        fileName: filename,
        takenAt,
        offset,
        lat,
        lng,
        camera,
        fileKey,
      },
    };
  });

  const { saved, skipped } = await savePhotos(rows.map((row) => row.photo));
  const savedIds = new Set(saved);
  const newTargets = rows
    .filter((row) => savedIds.has(row.photo.id) && row.photo.fileKey)
    .map((row) => ({ order: row.order, fileKey: row.photo.fileKey }));

  // 이번 파일로 이미지를 만들 수 있는 사진만 이어 올릴 수 있어요.
  const skippedRows = rows.filter((row) => !savedIds.has(row.photo.id) && row.photo.fileKey);
  const resumeTargets =
    skippedRows.length > 0 ? await findResumableImageUploads(ownerId, skippedRows) : [];
  if (isCancelled()) return null;

  return {
    saved: saved.length,
    existing: skipped.length,
    // 쌓을 때 열어 보고 알게 돼서, 고를 때 이름으로 뺀 skippedFiles와 따로 셉니다.
    unreadable: photos.filter((photo) => !photo.readable).length,
    newPhotoIds: saved,
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
async function findResumableImageUploads(ownerId, skippedRows) {
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
