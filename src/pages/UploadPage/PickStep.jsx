import { useRef } from 'react';

import { PHOTO_ACCEPT } from '@/constants/upload/upload';
import { filterPhotoFiles } from '@/utils/upload/photoFiles';

/**
 * 13a′ 사진 올리기 — 고르기 화면
 *
 * 책임: 사진을 고르게 하고, 사진 파일만 걸러 onPick으로 보냅니다.
 * 고른 사진을 들고 있거나 다음 화면을 그리지는 않습니다.
 *
 * 호출: UploadPage가 고른 사진이 없을 때 그립니다.
 * <PickStep onPick={setPhotoFiles} />
 *
 * 의도: 버튼 두 개와 끌어다 놓기(#51), 세 길이 모두 같은 거르기를 거쳐 onPick 하나로 나갑니다.
 *
 * 주의할 것들:
 *  - 같은 폴더를 다시 고르면 change가 오지 않습니다. input.value를 비워 줘야 합니다.
 *  - 휴대폰 브라우저에서 고르면 위치가 빠질 수 있습니다. TIP 문구 출력(#52)
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/timeline?node-id=241-4
 */
export default function PickStep({ onPick }) {
  // 파일 창은 input을 눌러야만 열리는데, input은 기본 모양을 바꿀 수 없어서 숨겨 두었습니다.
  // "지금 이 input을 눌러라"는 상태로 표현할 수 없는 명령이라, ref로 실제 input 요소를 잡아 두고
  // 버튼의 onClick에서 .click()을 부릅니다. 화면에 보이는 값이 아니라서 useState가 아닌 useRef입니다.
  const folderInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const handleInputChange = (event) => {
    const photos = filterPhotoFiles(event.target.files);
    if (photos.length > 0) {
      onPick(photos);
    }

    // 같은 폴더를 다시 골라도 change가 일어나도록 비워둡니다.
    event.target.value = '';
  };

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex max-w-360 flex-col gap-6 px-4 py-10 lg:px-30 lg:py-18">
        <header className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-[-0.02em] text-ink">사진 올리기</h1>
          <p className="text-lg leading-body-lg break-keep text-muted">
            폴더째로 넣어주시면 알아서 분류해드려요
          </p>
        </header>

        {/* 본문 곁 보조 내용 <aside> */}
        <aside className="flex items-center gap-3 border border-line bg-white px-5 py-4">
          <span className="font-mono text-xs leading-normal font-medium text-accent">TIP</span>
          <p className="flex-1 text-md leading-body-md break-keep text-body">
            휴대폰 사진은 PC로 옮겨 폴더째 넣는 게 가장 정확해요. 휴대폰 브라우저에서 바로 고르면
            위치가 빠질 수 있어요.
          </p>
        </aside>

        {/* 드롭존 */}
        <section className="flex h-75 flex-col items-center justify-center gap-3 border border-dashed border-dash bg-white px-4">
          <p className="text-center text-2xl font-bold text-ink">여기에 폴더째 끌어다 놓기</p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                folderInputRef.current.click();
              }}
              className="border border-nav bg-nav px-6 py-4 text-lg font-bold text-white"
            >
              폴더 고르기
            </button>
            <button
              type="button"
              onClick={() => {
                photoInputRef.current.click();
              }}
              className="border border-ink px-6 py-4 text-lg font-bold text-ink"
            >
              사진 고르기
            </button>
          </div>

          {/* 숨은 input 2개 */}
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory="" // 폴더를 고르는 창, React에서 빈 문자열로 줘야 속성이 붙는다.
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            onChange={handleInputChange}
            className="hidden"
          />
        </section>
      </div>
    </main>
  );
}
