import { useState, useEffect } from 'react';

import { useUploadStore } from '@/stores/upload/uploadStore';
import { calcStayMs } from '@/utils/upload/pass/calcStayMs';

import PassColorTip from './PassColorTip';
import PassControls from './PassControls';
import PassStrip from './PassStrip';
import PassTimeline from './PassTimeline';

/**
 * 사진을 시간순 한 줄로 훑으며 빈칸을 채우는 화면 (13h″ 지나가며 정리, #129)
 *
 * 사진마다 calcStayMs만큼 머물렀다가 저절로 다음 장으로 넘어가고, 마지막 장에서 멈춥니다.
 * 편집본도 같은 빠르기로 지나가고, 대신 카드 색으로 알려 줘요(PassStrip).
 * 사진 종류는 아직 파일 이름으로 정하는 임시 판정(getPassKind)이고, 진짜 분류는 다음 이슈에서 붙입니다.
 *
 * 호출: UploadPage가 쌓기 화면에서 [다음]을 누르면 그립니다.
 * <PassPhotosStep />
 */
export default function PassPhotosStep() {
  const photos = useUploadStore((state) => state.photos);
  // 지금 가운데에 있는 사진의 순서입니다. 사진 줄, 손글씨, 버튼이 같이 봐서 여기에 둡니다.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // photos와 currentIndex만 있으면 isLast와 stayMs를 계산할 수 있기 때문에 상태로 관리하지 않았습니다.
  const isLast = currentIndex >= photos.length - 1;
  const stayMs = calcStayMs(photos);

  // timer는 React 밖의 일입니다.(컨벤션 상 외부 동기화)
  // 사진마다 머무는 시간이 달라서 setInterval 대신 한 장마다 타이머를 새로 걸어요
  useEffect(() => {
    if (isLast || isPaused) return;

    const timer = setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
    }, stayMs);

    return () => clearTimeout(timer);
  }, [currentIndex, isLast, isPaused, stayMs]);

  // 버튼 하나로 멈추고 다시 재생합니다.
  const handlePause = () => {
    setIsPaused((prev) => !prev);
  };

  // 되돌린 사진이 바로 다시 지나가 버리지 않게 같이 멈춥니다.
  const handleUndo = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setIsPaused(true);
  };

  return (
    <main className="flex flex-1 flex-col bg-canvas">
      <div className="flex w-full flex-1 flex-col px-6 pt-14 pb-4 lg:px-16">
        {/* 넓은 화면에서는 오른쪽 칸에 진행 표시를 둬요 */}
        <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-12">
          <div>
            <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
              다음 단계 · 지나가며 정리
            </p>
            <h1 className="mt-3 text-5xl font-bold text-ink 2xl:text-6xl">지나가면서 정리할게요</h1>
            <p className="mt-3 text-lg break-keep text-muted">애매한 건 천천히 지나가요.</p>
          </div>
          {/* 멈추지 않고 흐르도록 머무는 시간 내내 다음 장으로 옮겨 가요 */}
          <PassTimeline currentIndex={currentIndex} moveMs={stayMs} />
        </header>
        <section aria-label="사진 정리" className="flex flex-1 flex-col justify-center py-4">
          <PassStrip currentIndex={currentIndex} moveMs={stayMs} />
          <PassControls
            isPaused={isPaused}
            isFirst={currentIndex === 0}
            isLast={isLast}
            onPause={handlePause}
            onUndo={handleUndo}
          />
          {/* 색 카드가 장식으로 보이지 않게, 사진 줄 바로 아래에서 뜻을 알려 줘요 */}
          <PassColorTip className="mt-6" />
        </section>
      </div>
    </main>
  );
}
