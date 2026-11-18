import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useInView } from '@/hooks/useInView';

let container;
let root;
let observers;

// 화면에 들어오는 때를 테스트가 정하려고 IntersectionObserver를 바꿔 둬요.
class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.disconnect = vi.fn();
    observers.push(this);
  }

  observe(element) {
    this.element = element;
  }

  emit(isIntersecting) {
    this.callback([{ isIntersecting, target: this.element }]);
  }
}

function Probe() {
  const { ref, isInView } = useInView();
  return <div ref={ref}>{isInView ? 'in' : 'out'}</div>;
}

async function render() {
  await act(async () => root.render(<Probe />));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  observers = [];
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('useInView', () => {
  test('화면 가까이 오기 전에는 꺼져 있고, 들어오면 켜진 뒤 관찰을 멈춰요', async () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    await render();

    expect(container.textContent).toBe('out');
    expect(observers[0].options.rootMargin).toBe('400px 0px');

    await act(async () => observers[0].emit(false));
    expect(container.textContent).toBe('out');

    await act(async () => observers[0].emit(true));
    expect(container.textContent).toBe('in');
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(observers).toHaveLength(1);
  });

  test('IntersectionObserver가 없으면 처음부터 켜져 있어요', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    await render();

    expect(container.textContent).toBe('in');
  });
});
