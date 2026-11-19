import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useFitWidth } from '@/hooks/useFitWidth';

let container;
let root;
let latest;

// 테스트는 Tailwind CSS를 불러오지 않아서, 한 줄로 그리는 모양을 style로 줘요.
// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ boxWidth, contentWidth }) {
  const { containerRef, contentRef, scale, height } = useFitWidth();
  useEffect(() => {
    latest = { scale, height };
  });
  return (
    <div ref={containerRef} style={{ width: boxWidth, height }}>
      <p
        ref={contentRef}
        style={{ display: 'inline-block', width: contentWidth, height: 140, margin: 0 }}
      />
    </div>
  );
}

// ResizeObserver는 그린 뒤에 알려 줘서, 알림이 오고 다시 그려질 때까지 프레임 두 번을 기다려요.
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function mount(boxWidth, contentWidth) {
  await act(async () => {
    root.render(<Probe boxWidth={boxWidth} contentWidth={contentWidth} />);
    await nextFrame();
    await nextFrame();
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('useFitWidth', () => {
  test('내용이 칸보다 넓으면 칸 폭에 맞는 배율과 줄인 높이를 줘요', async () => {
    await mount(600, 1200);

    expect(latest.scale).toBe(0.5);
    expect(latest.height).toBe(70);
  });

  test('내용이 칸 안에 들어가면 줄이지 않아요', async () => {
    await mount(1200, 800);

    expect(latest.scale).toBe(1);
    expect(latest.height).toBe(140);
  });

  test('줄인 뒤 칸이 넓어지면 다시 원래 크기로 돌아와요', async () => {
    await mount(600, 1200);
    await mount(1500, 1200);

    expect(latest.scale).toBe(1);
  });

  test('글자가 바뀌어 내용 폭이 커지면 다시 재서 줄여요', async () => {
    await mount(900, 600);
    await mount(900, 1800);

    expect(latest.scale).toBe(0.5);
  });
});
