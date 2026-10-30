import { useEffect, useState } from 'react';

import { resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_STATE = { photos: [], noPreviewCount: 0, isDone: false };

/**
 * 썸네일 한 장을 화면에 쓸 사진(PilePhoto)으로 만듭니다.
 * @param {Blob | null} thumb resizeThumbnail이 만든 썸네일. 브라우저가 못 그린 사진이면 null
 * @param {File} file 원본 파일
 * @param {number} order files 안의 순서 (0부터)
 * @returns {import('@/types').PilePhoto}
 */
function toPilePhoto(thumb, file, order) {
  return {
    // 파일 이름만 쓰면 다른 폴더의 같은 이름(IMG_0001.jpg)이 겹쳐 React key가 깨져서 순서를 붙입니다.
    id: `${order}-${file.name}`,
    order,
    filename: file.name,
    // 썸네일 Blob을 <img src>에 넣을 수 있는 주소로 바꿉니다. 다 쓰면 해제해야 합니다.
    // 못 그린 사진은 null로 두고 회색 칸으로 보여 줍니다. 버리지 않는 이유: HEIC는 Chrome·Windows가
    // 못 그릴 뿐 멀쩡한 사진이고, 촬영 정보(readExif)는 읽을 수 있어서 다음 단계에서 그대로 씁니다.
    src: thumb ? URL.createObjectURL(thumb) : null,
  };
}

// 아래 둘은 setState에 넘기는 "이전 상태 → 다음 상태" 함수입니다.
// 바로 앞 상태를 기준으로 바꿔야 해서 값 대신 함수를 넘깁니다.
// 기존 객체·배열은 고치지 않고 새로 만듭니다. 그래야 React가 바뀐 걸 알아챕니다.

/** 사진 한 장을 맨 뒤(더미 맨 위)에 붙이고, 미리 볼 수 없는 사진이면 그 수도 셉니다. */
const withPhoto = (photo) => (state) => ({
  ...state,
  photos: [...state.photos, photo],
  noPreviewCount: state.noPreviewCount + (photo.src ? 0 : 1),
});

/** 끝까지 다 줄였다고 표시합니다. */
const withDone = (state) => ({ ...state, isDone: true });

/**
 * 고른 사진을 한 장씩 썸네일로 줄여, 준비되는 대로 화면에 쓸 사진(PilePhoto)으로 돌려줍니다.(#87)
 *
 * 호출: PilePhotosStep
 * const { photos, noPreviewCount, isDone } = usePhotoThumbnails(files);
 *
 * 의도: 수백 장을 한꺼번에 디코딩하면 메모리가 크게 튀어서(4000×3000 한 장 ≈ 48MB) 한 장씩 줄입니다.
 * 줄이는 대로 바로 올려서 한 장씩 쌓이는 모습이 됩니다.
 * 브라우저가 그리지 못하는 사진(HEIC, 깨진 파일)도 버리지 않고 이미지 없이(src: null) 올립니다.
 * constants/upload.js의 "HEIC는 썸네일이 회색 칸" 약속대로입니다. 진짜 깨진 파일은 다음 단계(readExif)가 거릅니다.
 *
 * 주의할 점:
 *  - files가 바뀌면(배열이 다른 것이면) 이전 사진을 버리고 처음부터 다시 줄입니다.
 *    그래서 쓰는 쪽은 그릴 때마다 새 배열을 만들지 말고 같은 배열을 넘겨야 합니다.
 *  - 화면이 사라지거나 files가 바뀌면 남은 사진은 줄이지 않고, 만든 주소는 모두 해제합니다.
 * @param {File[]} files 13a″에서 고르고 거른 사진 파일 목록
 * @returns {{ photos: import('@/types').PilePhoto[], noPreviewCount: number, isDone: boolean }}
 *   photos는 고른 사진을 모두 고른 순서대로 담아요. noPreviewCount는 그중 미리 볼 수 없는(src: null) 수예요
 */
export function usePhotoThumbnails(files) {
  // 세 값은 늘 같이 바뀌어서 상태 하나로 묶었습니다.
  // 나눠 두면 "사진은 다 왔는데 isDone은 아직 false" 같은 어긋난 순간을 따로 신경 써야 합니다.
  // files도 같이 담아 "이 상태가 어떤 사진 묶음 것인지" 기억해 둡니다.
  const [state, setState] = useState({ files, ...INITIAL_STATE });

  // files가 바뀌었으면 이전 묶음의 사진·수를 버리고 처음 상태로 돌립니다.
  if (state.files !== files) {
    setState({ files, ...INITIAL_STATE });
  }

  // 줄이기는 화면을 그리는 일과 상관없는 바깥 작업이라 effect에서 시작합니다.
  useEffect(() => {
    // 화면이 사라지면 true로 바꿔, 남은 사진을 더 줄이지 않고 상태도 건드리지 않게 합니다.
    // 개발 모드(StrictMode)에서는 effect가 일부러 두 번 돌아서, 첫 번째 작업을 확실히 멈추는 데도 필요합니다.
    let isCancelled = false;

    // URL.createObjectURL로 만든 blob: 주소는 페이지가 살아 있는 동안 브라우저가 이미지를 붙잡고 있습니다.
    // 상태(state.photos)가 아니라 여기 따로 모으는 이유: 정리 함수는 effect가 처음 돌 때의 state만 보기 때문입니다.
    /** @type {string[]} 이번에 만든 blob: 주소. 정리할 때 모두 해제해요 */
    const urls = [];

    // 사진 한 장을 화면에 올리고, 나중에 해제하려고 주소를 기억해 둡니다.
    function showPhoto(photo) {
      if (photo.src) urls.push(photo.src);
      setState(withPhoto(photo));
    }

    // effect 함수는 async일 수 없어서(정리 함수만 돌려줘야 함) 안에 async 함수를 만들어 부릅니다.
    async function run() {
      for (const [order, file] of files.entries()) {
        const thumb = await resizeThumbnail(file);
        // 줄이는 동안 화면이 사라졌으면 여기서 멈춥니다. 이 한 장은 이미 줄였지만 올리지 않습니다.
        if (isCancelled) return;

        showPhoto(toPilePhoto(thumb, file, order));
      }
      setState(withDone);
    }

    run();

    return () => {
      isCancelled = true;
      // 지금까지 만든 썸네일 주소를 모두 놓아 줍니다. 놓은 주소는 <img>에서 더 이상 보이지 않습니다.
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  // files는 비교용이라 밖으로 내보내지 않습니다.
  const { photos, noPreviewCount, isDone } = state;
  return { photos, noPreviewCount, isDone };
}
