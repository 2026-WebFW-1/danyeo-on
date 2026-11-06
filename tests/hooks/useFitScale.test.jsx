import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useFitScale } from '@/hooks/useFitScale';

const DESIGN_WIDTH = 1440;

let container;
let root;
let latest;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ width, onScale }) {
  const { ref, scale } = useFitScale(DESIGN_WIDTH);
  useEffect(() => onScale(scale));
  return <div ref={ref} style={{ width }} />;
}

// ResizeObserver는 그린 뒤에 알려 줘서, 알림이 오고 다시 그려질 때까지 프레임 두 번을 기다려요.
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function mount(width) {
  await act(async () => {
    root.render(
      <Probe
        width={width}
        onScale={(scale) => {
          latest = scale;
        }}
      />,
    );
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

describe('useFitScale', () => {
  test('그리기 전에 먼저 재서, 프레임을 기다리지 않아도 첫 화면부터 줄어 있어요', () => {
    // ResizeObserver만 쓰면 알림이 그린 뒤에 와서, 기준 폭 그대로인 화면이 한두 프레임 보여요.
    // 프레임이 지나기 전에(동기로) 확인해요
    act(() => {
      root.render(
        <Probe
          width={720}
          onScale={(scale) => {
            latest = scale;
          }}
        />,
      );
    });

    expect(latest).toBe(0.5);
  });

  test('기준 폭보다 좁으면 그 비율로 줄여요', async () => {
    await mount(720);

    expect(latest).toBe(0.5);
  });

  test('기준 폭보다 넓어도 1을 넘지 않아요', async () => {
    await mount(2000);

    expect(latest).toBe(1);
  });

  test('폭이 바뀌면 배율도 바뀌어요', async () => {
    await mount(1440);
    expect(latest).toBe(1);

    await mount(1080);

    expect(latest).toBe(0.75);
  });
});
