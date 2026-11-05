import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useReveal } from '@/hooks/useReveal';

let container;
let root;
let latest;
let observers;

/** 관찰 대상이 화면에 들어왔다고 알려 주는 가짜 IntersectionObserver예요. */
class FakeObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    observers.push(this);
  }

  observe() {}

  disconnect() {
    this.disconnected = true;
  }

  notify(isIntersecting) {
    this.callback([{ isIntersecting }]);
  }
}

function Probe({ onResult }) {
  const { ref, isRevealed } = useReveal();
  useEffect(() => onResult(isRevealed));
  return <div ref={ref} />;
}

async function mount() {
  await act(async () =>
    root.render(
      <Probe
        onResult={(isRevealed) => {
          latest = isRevealed;
        }}
      />,
    ),
  );
}

function stubMotion({ isReduced }) {
  vi.stubGlobal('matchMedia', (query) => ({ matches: isReduced && query.includes('reduce') }));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  observers = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  stubMotion({ isReduced: false });
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('useReveal', () => {
  test('처음에는 꺼져 있다가 화면에 들어오면 켜져요', async () => {
    await mount();
    expect(latest).toBe(false);

    await act(async () => observers[0].notify(true));

    expect(latest).toBe(true);
  });

  test('화면 밖이라는 알림에는 그대로 꺼져 있어요', async () => {
    await mount();

    await act(async () => observers[0].notify(false));

    expect(latest).toBe(false);
  });

  test('한 번 켜지면 관찰을 멈추고 다시 꺼지지 않아요', async () => {
    await mount();

    await act(async () => observers[0].notify(true));

    expect(observers[0].disconnected).toBe(true);
    expect(latest).toBe(true);
  });

  test('움직임 줄이기 설정이면 처음부터 켜져 있고 관찰도 안 해요', async () => {
    stubMotion({ isReduced: true });

    await mount();

    expect(latest).toBe(true);
    expect(observers).toHaveLength(0);
  });

  test('IntersectionObserver가 없는 브라우저면 처음부터 켜져 있어요', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    await mount();

    expect(latest).toBe(true);
  });
});
