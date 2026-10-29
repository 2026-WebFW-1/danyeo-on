import { useEffect, useState } from 'react';

import { filesFromEntries, filterPhotoFiles } from '@/utils/upload/photoFiles';

/**
 * 화면 어디에든 끌어다 놓은 파일·폴더에서 사진만 골라 onPick으로 넘깁니다.(#51)
 * 끌고 있는 동안에는 덮개를 띄울 수 있게 끌고 있는지와 항목 수를 돌려줍니다.
 *
 * 호출: SelectPhotosStep. 화면이 사라지면 리스너도 떨어집니다.
 * const { isDragging, itemCount } = usePhotoDrop(onPick);
 *
 * 의도: Nav 위에 놓아도 받도록 window에 붙입니다.
 * window는 React가 그리는 요소가 아니라서 JSX 속성으로 못 달아 useEffect로 붙이고 뗍니다.
 * @param {(photos: File[]) => void} onPick
 * @returns {{ isDragging: boolean, itemCount: number }} itemCount는 맨 위 항목 수입니다. 폴더 안은 놓기 전에 열 수 없습니다.
 */
export function usePhotoDrop(onPick) {
  const [isDragging, setIsDragging] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // 페이지 안의 글자 및 이미지를 끌 때도 같은 이벤트가 와서,
    // 바깥에서 끌어온 파일일 때만 처리합니다.
    const isFileDrag = (event) => event.dataTransfer?.types.includes('Files');

    // dragenter·dragleave는 요소를 하나 넘을 때마다 옵니다. 들어간 수를 세서 0이 될 때만 창 밖으로 나갔다고 봅니다.
    // dragleave만 보고 끄면 버튼 위를 지날 때마다 덮개가 깜빡입니다.
    let enteredCount = 0;

    const handleDragEnter = (event) => {
      if (!isFileDrag(event)) return;
      enteredCount += 1;
      setIsDragging(true);
      setItemCount(event.dataTransfer.items.length);
    };

    const handleDragLeave = (event) => {
      if (!isFileDrag(event)) return;
      enteredCount -= 1;
      if (enteredCount === 0) {
        setIsDragging(false);
      }
    };

    // dragover를 막지 않으면 이 화면이 놓을 수 있는 곳이 아니어서 drop이 아예 오지 않습니다.
    const handleDragOver = (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
    };

    const handleDrop = async (event) => {
      if (!isFileDrag(event)) return;

      // 막지 않으면 브라우저가 사진을 새 탭으로 엽니다.
      event.preventDefault();

      // 놓으면 dragleave가 오지 않아서 여기서 덮개를 끕니다.
      enteredCount = 0;
      setIsDragging(false);

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

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onPick]);

  return { isDragging, itemCount };
}
