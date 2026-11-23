import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { usePhotoActions } from '@/hooks/usePhotoActions';

let container;
let root;
let latest;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe() {
  const actions = usePhotoActions();
  useEffect(() => {
    latest = actions;
  });
  return null;
}

const action = (onAction) => ({
  label: '복구',
  workingLabel: '복구하는 중…',
  failMessage: '복구하지 못했어요',
  onAction,
});

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root.render(<Probe />));
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
});

describe('usePhotoActions', () => {
  test('요청이 끝날 때까지 누른 동작의 라벨을 남기고, 끝나면 비워요', async () => {
    // given
    let finish;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });

    // when
    let running;
    await act(async () => {
      running = latest.run(action(() => pending));
    });

    // then
    expect(latest.runningLabel).toBe('복구');
    await act(async () => {
      finish();
      await running;
    });
    expect(latest.runningLabel).toBeNull();
    expect(latest.failMessage).toBeNull();
  });

  test('실패하면 그 동작의 안내를 남기고, 다시 누르면 지워요', async () => {
    // given
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onAction = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce();

    // when
    await act(async () => latest.run(action(onAction)));

    // then
    expect(latest.failMessage).toBe('복구하지 못했어요');
    await act(async () => latest.run(action(onAction)));
    expect(latest.failMessage).toBeNull();
  });
});
