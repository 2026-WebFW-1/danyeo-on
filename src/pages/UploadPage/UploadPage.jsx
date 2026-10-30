import { useState } from 'react';

import PilePhotosStep from './PilePhotosStep';
import SelectPhotosStep from './SelectPhotosStep';

/**
 * 사진 올리기 페이지. 13a″ 고르기 > 포개지며 쌓이기(#87) > 13h″ 지나가며 정리
 *
 * 책임: 지금 몇 단계인지와 단계 사이에 넘길 데이터(고른 사진)를 들고, 단계에 맞는 화면을 고릅니다.
 * 화면 모양은 그리지 않습니다. 각 단계 컴포넌트(SelectPhotosStep, PilePhotosStep …)가 그립니다.
 *
 * 호출: App의 Routes가 /upload 주소에서 그립니다. 지금은 /로 와도 여기로 보냅니다.
 *
 * 의도: 단계는 주소를 바꾸지 않고 이 안에서 상태로 넘깁니다.(#21)
 * 그래서 새로고침하면 처음(13a″)부터 다시 시작합니다. 고른 사진은 메모리에만 있습니다.
 * 13b″(읽으면서 미리보기)·13c″(다 읽음)는 없애고 포개지며 쌓이는 화면으로 대신합니다.(#87)
 *
 * 주의할 점:
 *  - 13h″가 생기면 photoFiles.length만으로는 단계를 나누지 못합니다. > step 상태
 */
export default function UploadPage() {
  const [photoFiles, setPhotoFiles] = useState([]);

  if (photoFiles.length === 0) {
    return <SelectPhotosStep onPick={setPhotoFiles} />;
  }

  return <PilePhotosStep files={photoFiles} />;
}
