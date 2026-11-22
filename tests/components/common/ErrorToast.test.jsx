import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ErrorToast from '@/components/common/ErrorToast';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('ErrorToast', () => {
  test('문구와 [다시 시도]를 알림으로 보여 줘요', async () => {
    // when
    await act(async () =>
      root.render(<ErrorToast message="서버에 연결하지 못했어요" onRetry={() => {}} />),
    );

    // then
    const alert = container.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('서버에 연결하지 못했어요');
    expect(alert.querySelector('button').textContent).toBe('다시 시도');
  });

  test('[다시 시도]를 누르면 onRetry를 불러요', async () => {
    // given
    const onRetry = vi.fn();
    await act(async () => root.render(<ErrorToast message="x" onRetry={onRetry} />));

    // when
    await act(async () => container.querySelector('button').click());

    // then
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
