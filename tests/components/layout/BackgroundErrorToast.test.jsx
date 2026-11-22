import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import BackgroundErrorToast from '@/components/layout/BackgroundErrorToast';
import { clearMyPhotos, getMyPhotos } from '@/services/myPhotosService';
import { useAuthStore } from '@/stores/authStore';
import { useCorrectionStore } from '@/stores/correctionStore';
import { usePostStore } from '@/stores/postStore';

vi.mock('@/services/myPhotosService', () => ({
  getMyPhotos: vi.fn(),
  clearMyPhotos: vi.fn(),
  subscribeMyPhotos: () => () => {},
  getMyPhotosVersion: () => 0,
}));

const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: 'x' };

let container;
let root;
let fetchPosts;
let refreshJourney;

const render = (path) =>
  act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <BackgroundErrorToast />
      </MemoryRouter>,
    ),
  );
const toast = () => container.querySelector('[role="alert"]');
const retry = () => act(async () => toast().querySelector('button').click());

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  fetchPosts = vi.fn();
  refreshJourney = vi.fn();
  useAuthStore.setState({ user: { id: 'u1' } });
  usePostStore.setState({ status: 'ready', fetch: fetchPosts });
  useCorrectionStore.setState({ journeyStatus: 'idle', refreshJourney });
  vi.mocked(getMyPhotos).mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => root.unmount());
  usePostStore.getState().reset();
  useCorrectionStore.getState().reset();
  useAuthStore.getState().reset();
  vi.resetAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BackgroundErrorToast', () => {
  test('실패한 게 없으면 아무것도 띄우지 않아요', async () => {
    await render('/places');

    expect(toast()).toBeNull();
  });

  test('글을 못 불러오면 띄우고, [다시 시도]는 글을 다시 불러요', async () => {
    // given
    usePostStore.setState({ status: 'error', error: LOAD_FAILED });

    // when
    await render('/passport');

    // then
    expect(toast().textContent).toContain('서버에 연결하지 못했어요');

    // when
    await retry();

    // then
    expect(fetchPosts).toHaveBeenCalledTimes(1);
  });

  test('01 지도에서는 글을 못 불러왔어도 띄우지 않아요(아래 재생 막대를 가려요)', async () => {
    // given
    usePostStore.setState({ status: 'error', error: LOAD_FAILED });

    // when
    await render('/map');

    // then
    expect(toast()).toBeNull();
  });

  test('글을 다시 불러와 성공하면 사라져요', async () => {
    // given
    usePostStore.setState({ status: 'error', error: LOAD_FAILED });
    await render('/');

    // when
    await act(async () => usePostStore.setState({ status: 'ready', error: null }));

    // then
    expect(toast()).toBeNull();
  });

  test('여행 다시 계산에 실패하면 띄우고, [다시 시도]는 다시 계산해요', async () => {
    // given
    useCorrectionStore.setState({ journeyStatus: 'failed' });

    // when
    await render('/places');
    await retry();

    // then
    expect(refreshJourney).toHaveBeenCalledTimes(1);
  });

  test.each(['/map', '/edit/photos'])(
    '여행 다시 계산 실패는 자기 안내가 있는 %s에서는 띄우지 않아요',
    async (path) => {
      useCorrectionStore.setState({ journeyStatus: 'failed' });

      await render(path);

      expect(toast()).toBeNull();
    },
  );

  test.each(['/places', '/places/some'])(
    '%s에서 내 사진 목록을 못 불러오면 띄우고, [다시 시도]는 사진을 다시 읽게 해요',
    async (path) => {
      // given
      vi.mocked(getMyPhotos).mockRejectedValue(LOAD_FAILED);

      // when
      await render(path);
      await retry();

      // then
      expect(clearMyPhotos).toHaveBeenCalledTimes(1);
    },
  );

  // 00 홈과 01 지도는 사진을 늘 읽지 않아서(1년 전 이맘때·도착 카드가 있을 때만), 여기서 읽으면 요청이 늘어요.
  test.each(['/', '/map', '/passport', '/chapter/밴쿠버-2025', '/upload'])(
    '사진을 늘 읽지 않거나 자기 안내가 있는 %s에서는 사진 목록을 읽지 않아요',
    async (path) => {
      vi.mocked(getMyPhotos).mockRejectedValue(LOAD_FAILED);

      await render(path);

      expect(getMyPhotos).not.toHaveBeenCalled();
      expect(toast()).toBeNull();
    },
  );

  test('여러 개가 실패해도 하나만 띄우고, [다시 시도]는 실패한 걸 모두 다시 불러요', async () => {
    // given
    usePostStore.setState({ status: 'error', error: LOAD_FAILED });
    useCorrectionStore.setState({ journeyStatus: 'failed' });
    vi.mocked(getMyPhotos).mockRejectedValue(LOAD_FAILED);

    // when
    await render('/places');

    // then
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);

    // when
    await retry();

    // then
    expect(fetchPosts).toHaveBeenCalledTimes(1);
    expect(refreshJourney).toHaveBeenCalledTimes(1);
    expect(clearMyPhotos).toHaveBeenCalledTimes(1);
  });
});
