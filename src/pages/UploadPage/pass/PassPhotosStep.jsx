import { useState, useEffect } from 'react';

import { useUploadStore } from '@/stores/upload/uploadStore';
import { calcStayMs } from '@/utils/upload/pass/calcStayMs';
import { findAskIndex } from '@/utils/upload/pass/findAskIndex';
import { getPassKind } from '@/utils/upload/pass/getPassKind';

import PassAskCard from './PassAskCard';
import PassColorTip from './PassColorTip';
import PassControls from './PassControls';
import PassStrip from './PassStrip';
import PassTimeline from './PassTimeline';
import SavePhotos from './SavePhotos';

// 줄이 끝난 뒤 첫 질문 자리로 되감는 시간이에요. 방금 다 본 사진을 다시 보여 줄 필요는 없어서
// 되감는다는 것만 알 수 있게 빠르게 넘겨요.
const REWIND_MS = 200;
// 답한 뒤 다음 질문 자리로 옮겨 가는 시간이에요. 줄 어디쯤으로 가는지 보이게 천천히 가요.
const SEEK_MS = 700;

// 지나가는 중, 끝에서 묻는 중, 다 정리함에 따라 바뀌는 머리말이에요.
const HEADINGS = {
  pass: { eyebrow: '다음 단계 · 지나가며 정리', title: '지나가면서 정리할게요' },
  ask: { eyebrow: '마지막 · 물어볼 것만', title: '몇 가지만 알려 주세요' },
  done: { eyebrow: '마지막 · 정리 끝', title: '다 정리했어요' },
};

/**
 * 고른 순서로 사진을 보여 주고, 줄이 끝나면 아직 답하지 않은 사진으로 돌아가요.
 */
export default function PassPhotosStep() {
  const photos = useUploadStore((state) => state.photos);
  // 사진 id별 답이에요. 페이지를 나갔다 와도 다시 묻지 않게 스토어에 둬요.
  const answers = useUploadStore((state) => state.passAnswers);
  const answerPass = useUploadStore((state) => state.answerPass);
  // 한 장의 재생 시간이 끝날 때마다 한 번만 올려요. 마지막 장을 보는 중과 다 본 뒤를 구분해요.
  const [passedCount, setPassedCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const lastIndex = Math.max(0, photos.length - 1);
  const currentIndex = Math.min(passedCount, lastIndex);
  const isPassed = passedCount >= photos.length;
  const isLast = currentIndex >= lastIndex;
  const stayMs = calcStayMs(photos);
  const askIndex = findAskIndex(photos, answers);
  const isAsking = isPassed && askIndex !== -1;
  const phase = isPassed ? (isAsking ? 'ask' : 'done') : 'pass';
  // 다 답하면 마지막 장으로 돌아가서, 손글씨와 사진 줄이 끝난 모습으로 남아요.
  const shownIndex = phase === 'pass' ? currentIndex : isAsking ? askIndex : lastIndex;
  const askTotal = photos.filter((photo) => getPassKind(photo) === 'ask').length;
  const excludedCount = Object.values(answers).filter((answer) => answer === 'exclude').length;
  // 아직 하나도 답하지 않았으면 끝에서 첫 질문으로 되감는 중이에요.
  const hasAnswer = Object.keys(answers).length > 0;

  useEffect(() => {
    if (isPassed || isPaused) return;

    const timer = setTimeout(() => {
      setPassedCount(passedCount + 1);
    }, stayMs);

    return () => clearTimeout(timer);
  }, [passedCount, isPassed, isPaused, stayMs]);

  const handleTogglePlayback = () => {
    setIsPaused((prev) => !prev);
  };

  // 되돌린 사진이 바로 다시 지나가 버리지 않게 같이 멈춥니다.
  const handleUndo = () => {
    setPassedCount(Math.max(0, passedCount - 1));
    setIsPaused(true);
  };

  // 답을 남기면 findAskIndex가 다음 질문을 찾아서, 사진 줄이 그 자리로 옮겨 가요.
  const handleAnswer = (answer) => {
    answerPass(photos[askIndex].id, answer);
  };

  const heading = HEADINGS[phase];
  const description = {
    pass: '애매한 건 천천히 지나가요.',
    ask: '건너뛰어도 돼요. 나중에 사진 정리에서 다시 할 수 있어요.',
    done: `${photos.length - excludedCount}장을 시간순으로 넣었어요.`,
  }[phase];

  return (
    <main className="flex flex-1 flex-col bg-canvas">
      <div className="flex w-full flex-1 flex-col px-6 pt-14 pb-4 lg:px-16">
        {/* 넓은 화면에서는 오른쪽 칸에 진행 표시를 둬요 */}
        <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-12">
          <div>
            <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
              {heading.eyebrow}
            </p>
            <h1 className="mt-3 text-5xl font-bold text-ink 2xl:text-6xl">{heading.title}</h1>
            <p className="mt-3 text-lg break-keep text-muted">{description}</p>
            {phase === 'done' && <SavePhotos />}
          </div>
          {/* 멈추거나 질문으로 넘어간 순간에는 손글씨도 그때까지 다 본 장수에 맞춰요. */}
          <PassTimeline
            passedCount={passedCount}
            total={photos.length}
            moveMs={isPaused || isPassed ? 0 : stayMs}
          />
        </header>
        <section aria-label="사진 정리" className="flex flex-1 flex-col justify-center py-4">
          {/* 질문 카드를 띄운 사진 바로 옆에 두려고 사진 줄 가운데를 기준으로 겹쳐요 */}
          <div className="relative">
            <PassStrip
              currentIndex={shownIndex}
              moveMs={!isPassed ? stayMs : hasAnswer ? SEEK_MS : REWIND_MS}
              isAsking={isAsking}
            />
            {isAsking && (
              <PassAskCard
                photo={photos[askIndex]}
                step={Object.keys(answers).length + 1}
                total={askTotal}
                onAnswer={handleAnswer}
                className="absolute -top-20 right-0 left-[calc(50%+8rem)] h-72"
              />
            )}
          </div>
          {/* 끝난 뒤에는 멈추거나 되돌릴 흐름이 없어서 버튼 줄을 그리지 않아요 */}
          {!isPassed && (
            <PassControls
              takenAt={photos[currentIndex]?.takenAt}
              isPaused={isPaused}
              isFirst={currentIndex === 0}
              isLast={isLast}
              onTogglePlayback={handleTogglePlayback}
              onUndo={handleUndo}
            />
          )}
          {/* 색 카드가 장식으로 보이지 않게, 사진 줄 바로 아래에서 뜻을 알려 줘요 */}
          <PassColorTip className="mt-6" />
        </section>
      </div>
    </main>
  );
}
