import { useRef } from 'react';

import { PHOTO_ACCEPT } from '@/constants/upload';
import { filterPhotoFiles } from '@/utils/upload/photoFiles';

import ExampleTripCards from './ExampleTripCards';
import PolaroidStack from './PolaroidStack';

/**
 * 13a″ 사진 올리기 — 고르기 화면
 *
 * 책임: 사진을 고르게 하고, 사진 파일만 걸러 onPick으로 보냅니다.
 * 고른 사진을 들고 있거나 다음 화면을 그리지는 않습니다.
 *
 * 호출: UploadPage가 고른 사진이 없을 때 그립니다.
 * <SelectPhotosStep onPick={setPhotoFiles} />
 *
 * 의도: 버튼 두 개와 화면 전체 끌어다 놓기(#51), 세 길이 모두 같은 거르기를 거쳐 onPick 하나로 나갑니다.
 *
 * 주의할 것들:
 *  - 같은 폴더를 다시 고르면 change가 오지 않습니다. input.value를 비워 줘야 합니다.
 *  - 휴대폰 브라우저에서 고르면 위치가 빠질 수 있습니다. 기기별 안내는 버튼을 누르면 뜨는 다이얼로그로(#52)
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=355-32
 */
export default function SelectPhotosStep({ onPick }) {
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

  // 휴대폰: 화면이 내용보다 길면 남는 공간을 위아래로 나눠 내용을 가운데에 둡니다.
  // md 이상: 남는 높이를 전부 위쪽 줄(글·폴라로이드)에 줘서 Nav와 구분선 사이를 채우고, 그 안에서 각자 세로 가운데에 둡니다.
  // flex 안에서 mx-auto는 폭을 내용만큼 줄여 버려서 w-full을 같이 줍니다.
  return (
    <main className="flex flex-1 flex-col justify-center bg-canvas">
      <div className="mx-auto flex w-full max-w-360 flex-col px-4 py-10 md:flex-1 lg:px-30 lg:pt-14 lg:pb-12 2xl:max-w-400">
        {/* 왼쪽 칸은 글·버튼 폭(auto), 오른쪽 칸은 남는 폭 전부(1fr). */}
        <div className="md:grid md:flex-1 md:grid-cols-[auto_1fr] md:gap-10">
          <header className="md:self-center">
            <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
              STEP 1 / 2 · 고르기
            </p>
            <h1 className="mt-3 text-6xl font-bold text-ink 2xl:text-7xl">사진 올리기</h1>
            <p className="mt-3 text-xl break-keep text-muted 2xl:text-2xl">
              폴더째 넣으면 여행별로 알아서 나눠 드려요.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  folderInputRef.current.click();
                }}
                className="h-14 w-45 bg-nav text-lg font-bold text-white"
              >
                폴더 고르기
              </button>
              <button
                type="button"
                onClick={() => {
                  photoInputRef.current.click();
                }}
                className="h-14 w-40 border border-nav bg-white text-lg font-medium text-ink"
              >
                사진만 고르기
              </button>
            </div>

            <p className="mt-5 text-md text-muted">jpg · heic 등 사진 파일</p>

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
          </header>
          {/* 꾸밈용이라 휴대폰에서는 숨깁니다. 오른쪽 칸을 위아래로 다 채우고 폴라로이드를 상하좌우 가운데에 둡니다.
              칸 폭의 88%로 늘고 줄되 피그마 크기(480)를 넘지 않습니다.
              translate-y-[-5%]: 카드가 상자 높이의 11%~100% 지점에 그려져서 상자째 가운데에 두면 아래로 쏠려 보입니다. */}
          <div className="hidden items-center justify-center md:flex">
            <PolaroidStack className="w-[88%] max-w-120 translate-y-[-5%] 2xl:max-w-150" />
          </div>
        </div>

        {/* 위쪽 줄 위아래 여백을 같게 하려고 위 패딩(py-10, lg:pt-14)과 같은 값을 줍니다. */}
        <hr className="mt-6 border-line md:mt-10 lg:mt-14" />

        <div className="mt-5">
          <ExampleTripCards />
        </div>
      </div>
    </main>
  );
}
