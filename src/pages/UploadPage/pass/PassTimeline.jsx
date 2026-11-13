import { useId } from 'react';

import { useUploadStore } from '@/stores/upload/uploadStore';

// "My Journey"를 손으로 그린 획이에요(viewBox 10 10 500 150).
// 글자 모양을 고치려면 피그마에서 이 경로를 펜으로 다듬어 d 값을 바꾸고, MY_SHARE도 다시 재요.
const MY_PATH =
  'M20 110 C30 70 38 35 45 25 C50 18 54 30 56 45 L66 95 C70 60 80 30 90 25 C96 22 98 40 98 60 L100 108 ' +
  'C102 115 110 112 115 100 C117 85 118 68 121 62 C124 80 124 98 136 98 C146 98 148 80 149 62 L147 130 ' +
  'C145 150 128 155 125 143 C123 133 140 120 165 112';
const JOURNEY_PATH =
  'M200 35 C215 20 248 18 250 32 C251 40 245 60 240 90 C236 115 228 145 212 148 C198 150 196 130 214 118 ' +
  'C230 108 250 100 262 92 C266 70 280 60 292 64 C304 68 302 96 288 98 C274 100 268 84 278 72 ' +
  'C284 66 296 64 306 66 C308 80 306 96 316 98 C326 99 332 84 334 64 L334 92 C335 99 342 99 348 92 ' +
  'C350 80 351 70 352 60 C355 70 361 69 365 62 C367 59 371 60 372 64 C371 78 368 90 374 98 ' +
  'C374 84 376 70 378 64 C382 60 396 58 398 70 L400 92 C401 99 410 99 414 92 ' +
  'C420 86 440 76 434 66 C428 58 414 66 416 82 C418 98 436 100 448 92 ' +
  'C452 84 452 68 454 62 C456 80 456 98 468 98 C478 98 482 80 483 62 L481 130 ' +
  'C479 150 462 155 459 143 C457 133 474 120 500 112';
// 전체 획 길이 중 "My"가 차지하는 몫(633 / 1773, 브라우저 getTotalLength로 잼).
// 한 경로에 두 단어(M 두 번)를 넣으면 점선이 단어마다 처음부터 다시 시작돼서,
// 81%만 지나도 두 단어가 다 칠해졌어요. 그래서 단어를 나눠 각자 채워요.
const MY_SHARE = 0.36;
// 두 획(남은 획·지나온 획)이 같이 쓰는 굵기와 둥근 끝
const STROKE = 'fill-none stroke-12 [stroke-linecap:round] [stroke-linejoin:round]';

/**
 * 전체 사진 중 지금 어디를 지나가는지 보여 주는 손글씨예요. 지나간 만큼 "My Journey" 획이 색으로 채워져요.
 *
 * 호출: PassPhotosStep 머리말 오른쪽에서 그려요.
 * <PassTimeline currentIndex={0} moveMs={600} />
 *
 * @param {object} props
 * @param {number} props.currentIndex 지금 지나가는 사진의 순서
 * @param {number} props.moveMs 사진 줄과 같은 빠르기로 차오르게 합니다.
 */
export default function PassTimeline({ currentIndex, moveMs }) {
  const total = useUploadStore((state) => state.photos.length);
  // 같은 화면에 두 번 그려져도 그라데이션 id가 겹치지 않게 해요.
  const gradientId = useId();

  // 지금 위치를 0 ~ 1로. 사진이 한 장이면 맨 앞입니다.
  const position = total > 1 ? currentIndex / (total - 1) : 0;
  // "My"를 다 채운 뒤에 "Journey"를 채워요.
  const myPosition = Math.min(1, position / MY_SHARE);
  const journeyPosition = Math.max(0, (position - MY_SHARE) / (1 - MY_SHARE));
  // 반올림하면 300장 중 299장째(99.7%)도 100%로 보여서, 끝까지 가야만 100%가 되게 내려요.
  const percent = Math.floor(position * 100);
  const passedCount = total > 0 ? currentIndex + 1 : 0;

  return (
    <div
      role="progressbar"
      aria-label="사진 정리 진행률"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`전체 ${total}장 중 ${passedCount}장 지남`}
      className="w-full max-w-65 justify-self-center lg:justify-self-end"
    >
      <svg
        viewBox="10 10 500 150"
        aria-hidden="true"
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          {/* 두 단어가 한 그라데이션을 나눠 쓰도록, 단어 상자가 아니라 글자 전체 폭(20~500)에 걸어요 */}
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="20" x2="500">
            <stop offset="0" style={{ stopColor: 'var(--color-journey-start)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--color-accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-journey-end)' }} />
          </linearGradient>
        </defs>
        {/* 남은 획. 글자 전체를 연회색으로 깔아 둬요 */}
        <path d={`${MY_PATH} ${JOURNEY_PATH}`} className={`${STROKE} stroke-line`} />
        {/* 지나온 획. pathLength를 1로 두고, 점선 하나(길이 1)를 1 - 진행만큼 밀어서
            지나온 만큼만 획 순서대로 보여요 */}
        {[
          { key: 'my', d: MY_PATH, progress: myPosition },
          { key: 'journey', d: JOURNEY_PATH, progress: journeyPosition },
        ].map(({ key, d, progress }) => (
          <path
            key={key}
            d={d}
            pathLength={1}
            strokeDasharray="1 1"
            stroke={`url(#${gradientId})`}
            className={`${STROKE} transition-[stroke-dashoffset] ease-linear motion-reduce:transition-none`}
            style={{ strokeDashoffset: 1 - progress, transitionDuration: `${moveMs}ms` }}
          />
        ))}
      </svg>
      <p className="mt-1 flex justify-between text-xs text-muted">
        <span>
          {passedCount} / {total}장
        </span>
        <span className="font-mono text-accent">{percent}%</span>
      </p>
    </div>
  );
}
