import { useEffect, useState } from 'react';

import { resizePhoto } from '@/utils/resizePhoto';

/**
 * 고른 사진을 한 장씩 썸네일로 줄여, 준비되는 대로 화면에 쓸 주소를 돌려줍니다.(#87)
 *
 * 호출: PilePhotosStep
 * const { photos, failedCount, isDone } = usePhotoThumbnails(files);
 *
 * 의도: 수백 장을 한꺼번에 디코딩하면 메모리가 크게 튀어서 한 장씩 차례로 줄입니다.
 * 브라우저가 열지 못하는 사진(HEIC, 깨진 파일)은 건너뛰고 수만 셉니다.
 *
 * 주의할 점:
 *  - 같은 배열을 계속 넘겨야 합니다. 새 사진 묶음은 쓰는 쪽이 key를 바꿔 새로 그려 주세요.
 *  - 화면이 사라지면 남은 사진은 줄이지 않고, 만든 주소는 모두 해제합니다.
 * @param {File[]} files
 * @returns {{ photos: { id: string, filename: string, src: string }[], failedCount: number, isDone: boolean }}
 */
export function usePhotoThumbnails(files) {
  const [state, setState] = useState({ photos: [], failedCount: 0, isDone: false });

  useEffect(() => {
    let isCancelled = false;
    const urls = [];

    async function run() {
      for (const [index, file] of files.entries()) {
        const result = await resizePhoto(file);
        if (isCancelled) return;

        if (!result) {
          setState((current) => ({ ...current, failedCount: current.failedCount + 1 }));
          continue;
        }

        const src = URL.createObjectURL(result.thumb);
        urls.push(src);
        const photo = { id: `${index}-${file.name}`, filename: file.name, src };
        setState((current) => ({ ...current, photos: [...current.photos, photo] }));
      }
      if (!isCancelled) setState((current) => ({ ...current, isDone: true }));
    }

    void run();

    return () => {
      isCancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return state;
}
