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
 * 사진을 시간순 한 줄로 훑으며 빈칸을 채우는 화면 (13h″ 지나가며 정리, #129)
 *
 * 사진마다 calcStayMs만큼 머물렀다가 저절로 다음 장으로 넘어가요.
 * 편집본도 같은 빠르기로 지나가고, 대신 카드 색으로 알려 줘요(PassStrip).
 * 자리를 못 찾은 사진('ask')도 지나갈 때는 멈추지 않고, 줄이 끝나면 그 자리로 되감아 하나씩 물어요(#140).
 * 사진 종류는 아직 파일 이름으로 정하는 임시 판정(getPassKind)이에요.
 *
 * 호출: UploadPage가 쌓기 화면에서 [다음]을 누르면 그립니다.
 * <PassPhotosStep />
 */
export default function PassPhotosStep() {
  const photos = useUploadStore((state) => state.photos);
  // 지나가는 동안 가운데에 있는 사진의 순서입니다. 사진 줄, 손글씨, 버튼이 같이 봐서 여기에 둡니다.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // 줄이 끝까지 지나갔는지예요. 지나간 뒤에는 currentIndex 대신 남은 질문 자리를 가운데에 둬요.
  const [isPassed, setIsPassed] = useState(false);
  // 사진 id별 답이에요. 아직 이 화면에서만 써서 스토어로 올리지 않았어요.
  const [answers, setAnswers] = useState({});

  // 아래 값은 모두 photos·currentIndex·isPassed·answers로 계산할 수 있어서 상태로 두지 않았어요.
  const lastIndex = Math.max(0, photos.length - 1);
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

  // timer는 React 밖의 일입니다.(컨벤션 상 외부 동기화)
  // 사진마다 머무는 시간이 달라서 setInterval 대신 한 장마다 타이머를 새로 걸어요
  useEffect(() => {
    if (isPassed || isPaused) return;

    const timer = setTimeout(() => {
      // 마지막 장에서도 한 번 머문 뒤에 끝난 것으로 쳐야 마지막 사진이 보여요.
      if (isLast) setIsPassed(true);
      else setCurrentIndex(currentIndex + 1);
    }, stayMs);

    return () => clearTimeout(timer);
  }, [currentIndex, isLast, isPassed, isPaused, stayMs]);

  // 버튼 하나로 멈추고 다시 재생합니다.
  const handlePause = () => {
    setIsPaused((prev) => !prev);
  };

  // 되돌린 사진이 바로 다시 지나가 버리지 않게 같이 멈춥니다.
  const handleUndo = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setIsPaused(true);
  };

  // 답을 남기면 findAskIndex가 다음 질문을 찾아서, 사진 줄이 그 자리로 옮겨 가요.
  const handleAnswer = (answer) => {
    const photo = photos[askIndex];
    setAnswers((prev) => ({ ...prev, [photo.id]: answer }));
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
          </div>
          {/* 멈추지 않고 흐르도록 머무는 시간 내내 다음 장으로 옮겨 가요.
              끝난 뒤 질문 자리로 되감아도 지나온 만큼은 그대로라 마지막 장 기준으로 채워 둬요 */}
          <PassTimeline currentIndex={isPassed ? lastIndex : currentIndex} moveMs={stayMs} />
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
                className="mx-auto mt-4 xl:absolute xl:top-8 xl:left-[calc(50%+8.5rem)] xl:mt-0"
              />
            )}
          </div>
          {/* 끝난 뒤에는 멈추거나 되돌릴 흐름이 없어서 버튼 줄을 그리지 않아요 */}
          {!isPassed && (
            <PassControls
              isPaused={isPaused}
              isFirst={currentIndex === 0}
              isLast={isLast}
              onPause={handlePause}
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
