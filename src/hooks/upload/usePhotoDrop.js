import { useEffect } from 'react';

import { filesFromEntries, filterPhotoFiles } from '@/utils/upload/photoFiles';

/**
 * 화면 어디에든 끌어다 놓은 파일·폴더에서 사진만 골라 onPick으로 넘깁니다.(#51)
 *
 * 호출: SelectPhotosStep. 화면이 사라지면 리스너도 떨어집니다.
 * usePhotoDrop(onPick);
 *
 * 의도: Nav 위에 놓아도 받도록 window에 붙입니다.
 * window는 React가 그리는 요소가 아니라서 JSX 속성으로 못 달아 useEffect로 붙이고 뗍니다.
 * @param {(photos: File[]) => void} onPick
 */
export function usePhotoDrop(onPick) {
  useEffect(() => {
    // 페이지 안의 글자 및 이미지를 끌 때도 같은 이벤트가 와서,
    // 바깥에서 끌어온 파일일 때만 처리합니다.
    const isFileDrag = (event) => event.dataTransfer?.types.includes('Files');

    // dragover를 막지 않으면 이 화면이 놓을 수 있는 곳이 아니어서 drop이 아예 오지 않습니다.
    const handleDragOver = (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    };

    const handleDrop = async (event) => {
      if (!isFileDrag(event)) return;

      // 막지 않으면 브라우저가 사진을 새 탭으로 엽니다.
      event.preventDefault();

      // items는 이 함수가 처음 await을 만나는 순간 비워집니다. 그래서 entry부터 다 꺼내둡니다.
      // 글자 같은 파일이 아닌 항목은 null이 와서 제외합니다.
      const entries = Array.from(event.dataTransfer.items)
        .map((item) => item.webkitGetAsEntry())
        .filter(Boolean);

      const files = await filesFromEntries(entries);
      const photos = filterPhotoFiles(files);
      if (photos.length > 0) {
        onPick(photos);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onPick]);
}
