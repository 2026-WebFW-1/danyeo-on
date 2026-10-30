import { useEffect, useState } from 'react';

import { resizeThumbnail } from '@/utils/upload/resizePhoto';

const INITIAL_STATE = { photos: [], failedCount: 0, isDone: false };

/**
 * 썸네일 한 장을 화면에 쓸 사진(PilePhoto)으로 만듭니다.
 * @param {Blob} thumb resizeThumbnail이 만든 썸네일
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
    src: URL.createObjectURL(thumb),
  };
}

// 아래 셋은 setState에 넘기는 "이전 상태 → 다음 상태" 함수입니다.
// 바로 앞 상태를 기준으로 바꿔야 해서 값 대신 함수를 넘깁니다.
// 기존 객체·배열은 고치지 않고 새로 만듭니다. 그래야 React가 바뀐 걸 알아챕니다.

/** 사진 한 장을 맨 뒤(더미 맨 위)에 붙입니다. */
const withPhoto = (photo) => (state) => ({ ...state, photos: [...state.photos, photo] });

/** 열지 못한 사진 수를 하나 늘립니다. 어떤 파일인지는 아직 화면에서 쓰지 않아서 수만 셉니다. */
const withFailed = (state) => ({ ...state, failedCount: state.failedCount + 1 });

/** 끝까지 다 줄였다고 표시합니다. */
const withDone = (state) => ({ ...state, isDone: true });

/**
 * 고른 사진을 한 장씩 썸네일로 줄여, 준비되는 대로 화면에 쓸 사진(PilePhoto)으로 돌려줍니다.(#87)
 *
 * 호출: PilePhotosStep
 * const { photos, failedCount, isDone } = usePhotoThumbnails(files);
 *
 * 의도: 수백 장을 한꺼번에 디코딩하면 메모리가 크게 튀어서(4000×3000 한 장 ≈ 48MB) 한 장씩 줄입니다.
 * 줄이는 대로 바로 올려서 한 장씩 쌓이는 모습이 됩니다.
 * 브라우저가 열지 못하는 사진(HEIC, 깨진 파일)은 멈추지 않고 건너뛰고 수만 셉니다.
 *
 * 주의할 점:
 *  - 같은 배열을 계속 넘겨야 합니다. 새 사진 묶음은 쓰는 쪽이 key를 바꿔 새로 그려 주세요.
 *  - 화면이 사라지면 남은 사진은 줄이지 않고, 만든 주소는 모두 해제합니다.
 * @param {File[]} files 13a″에서 고르고 거른 사진 파일 목록
 * @returns {{ photos: import('@/types').PilePhoto[], failedCount: number, isDone: boolean }}
 *   photos는 줄이기에 성공한 사진만 고른 순서대로 담겨요. failedCount는 열지 못해 건너뛴 수예요
 */
export function usePhotoThumbnails(files) {
  // 세 값은 늘 같이 바뀌어서 상태 하나로 묶었습니다.
  // 나눠 두면 "사진은 다 왔는데 isDone은 아직 false" 같은 어긋난 순간을 따로 신경 써야 합니다.
  const [state, setState] = useState(INITIAL_STATE);

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
      urls.push(photo.src);
      setState(withPhoto(photo));
    }

    // effect 함수는 async일 수 없어서(정리 함수만 돌려줘야 함) 안에 async 함수를 만들어 부릅니다.
    async function run() {
      for (const [order, file] of files.entries()) {
        const thumb = await resizeThumbnail(file);
        // 줄이는 동안 화면이 사라졌으면 여기서 멈춥니다. 이 한 장은 이미 줄였지만 올리지 않습니다.
        if (isCancelled) return;

        if (thumb) showPhoto(toPilePhoto(thumb, file, order));
        else setState(withFailed);
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

  return state;
}
