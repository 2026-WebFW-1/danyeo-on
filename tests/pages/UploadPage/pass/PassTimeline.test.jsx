import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';

import PassTimeline from '@/pages/UploadPage/pass/PassTimeline';
import '@/styles/global.css';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test.each([
  [0, 0, 0],
  [0, 1, 0],
  [1, 1, 100],
  [29, 100, 29],
  [299, 300, 99],
])('%i장을 다 봤고 전체가 %i장이면 진행률은 %i예요', async (passedCount, total, percent) => {
  await act(() => root.render(<PassTimeline passedCount={passedCount} total={total} moveMs={0} />));
  const progress = container.querySelector('[role="progressbar"]');
  expect(progress.getAttribute('aria-valuenow')).toBe(String(percent));
  expect(progress.textContent).toBe(`${passedCount} / ${total}장${percent}%`);
});

test('진행률이 한 번에 뛰어도 My를 다 채운 뒤 Journey를 그려요', async () => {
  const renderCount = (passedCount, moveMs = 1000) =>
    act(() => root.render(<PassTimeline passedCount={passedCount} total={10} moveMs={moveMs} />));
  await renderCount(0);
  const [my, journey] = container.querySelectorAll('path[pathLength]');
  // 각 단어의 획을 따라 시작과 끝 근처를 찍어 실제로 칠해진 자리인지 확인해요.
  const isDrawn = (path, fraction) =>
    path.isPointInStroke(path.getPointAtLength(path.getTotalLength() * fraction));
  expect(isDrawn(my, 0.1)).toBe(false);
  expect(isDrawn(journey, 0.1)).toBe(false);

  await renderCount(10);
  const [transition] = container.querySelector('svg').getAnimations();
  transition.pause();
  await transition.ready;
  transition.currentTime = 200;
  expect(isDrawn(my, 0.1)).toBe(true);
  expect(isDrawn(my, 0.9)).toBe(false);
  expect(isDrawn(journey, 0.1)).toBe(false);

  transition.currentTime = 600;
  expect(isDrawn(my, 0.9)).toBe(true);
  expect(isDrawn(journey, 0.1)).toBe(true);
  expect(isDrawn(journey, 0.9)).toBe(false);

  // 멈추면 장수가 그대로여도 남은 애니메이션이 끝나고 목표 위치가 즉시 보여요.
  await renderCount(10, 0);
  expect(isDrawn(journey, 0.9)).toBe(true);
});
