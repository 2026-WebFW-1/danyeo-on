import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useLoadPosts } from '@/hooks/useLoadPosts';
import { getPosts } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';

vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: 'x' };

let container;
let root;
let latestStatus;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe() {
  const status = useLoadPosts();
  useEffect(() => {
    latestStatus = status;
  });
  return null;
}

const mount = (ui = <Probe />) => act(async () => root.render(ui));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  usePostStore.getState().reset();
  latestStatus = undefined;
  vi.mocked(getPosts).mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => root.unmount());
  usePostStore.getState().reset();
  vi.resetAllMocks();
});

describe('useLoadPosts', () => {
  test('아직 안 불렀으면 들어올 때 글을 불러오고, 스토어의 상태를 돌려줘요', async () => {
    await mount();

    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(latestStatus).toBe('ready');
  });

  test('개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 불러요', async () => {
    await mount(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );

    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('이미 받아 둔 상태면 다시 부르지 않아요', async () => {
    await mount();
    await act(async () => root.render(null));
    await mount();

    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('지난번에 실패해서 error로 남아 있으면 들어올 때 한 번 더 불러요', async () => {
    vi.mocked(getPosts).mockRejectedValueOnce(LOAD_FAILED).mockResolvedValueOnce([]);

    await mount();
    expect(usePostStore.getState().status).toBe('error');

    await act(async () => root.render(null));
    await mount();

    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(latestStatus).toBe('ready');
  });

  test('계속 실패해도 같은 화면에 머무는 동안은 다시 부르지 않아요', async () => {
    vi.mocked(getPosts).mockRejectedValue(LOAD_FAILED);

    await mount();
    await mount();

    expect(latestStatus).toBe('error');
    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('화면이 열려 있는 동안 글이 처음 상태로 돌아가면(계정 바뀜) 다시 불러요', async () => {
    await mount();

    await act(async () => usePostStore.getState().reset());

    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(latestStatus).toBe('ready');
  });
});
