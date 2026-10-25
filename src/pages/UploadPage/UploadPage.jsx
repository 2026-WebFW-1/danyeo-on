import { useState } from 'react';

import SelectPhotosStep from './SelectPhotosStep';

/**
 * 사진 올리기 페이지. 13a′ 고르기 > 13b′ 읽기 > 13c′ 다 읽음
 *
 * 책임: 지금 몇 단계인지와 단계 사이에 넘길 데이터(고른 사진)를 들고, 단계에 맞는 화면을 고릅니다.
 * 화면 모양은 그리지 않습니다. 각 단계 컴포넌트(SelectPhotosStep …)가 그립니다.
 *
 * 호출: App이 그립니다. 라우터가 생기면 /upload 경로
 *
 * 의도: 세 단계는 주소를 바꾸지 않고 이 안에서 상태로 넘깁니다.(#21)
 * 그래서 새로고침하면 처음(13a′)부터 다시 시작합니다. 고른 사진은 메모리에만 있습니다.
 *
 * 주의할 점:
 *  - 13b′(#23)에서 "읽는 중" 상태가 생기면 photoFiles.length만으로는 단계를 나누지 못합니다. > step 상태
 */
export default function UploadPage() {
  const [photoFiles, setPhotoFiles] = useState([]);

  if (photoFiles.length === 0) {
    return <SelectPhotosStep onPick={setPhotoFiles} />;
  }

  // TODO(titanfall7274): 13b′(#23)가 생기면 읽으면서 미리보기 화면으로 바꾸기
  return (
    <main className="flex-1 bg-canvas px-4 py-10 lg:px-30 lg:py-18">
      <p className="text-lg text-ink">사진 {photoFiles.length}장을 골랐어요.</p>
    </main>
  );
}
