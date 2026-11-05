import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useMyPhotos } from '@/hooks/useMyPhotos';
import { getMyPhotos } from '@/services/myPhotosService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/myPhotosService', () => ({ getMyPhotos: vi.fn() }));

const photosA = [{ id: 'a', ownerId: 'u1', fileKey: 'public:/photos/a.webp' }];
const photosB = [{ id: 'b', ownerId: 'u2', fileKey: 'public:/photos/b.webp' }];

let container;
let root;
let latest;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ onResult }) {
  const result = useMyPhotos();
  useEffect(() => onResult(result));
  return null;
}

async function mount() {
  await act(async () =>
    root.render(
      <Probe
        onResult={(result) => {
          latest = result;
        }}
      />,
    ),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  useAuthStore.setState({ user: { id: 'u1' } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  useAuthStore.setState({ user: null });
  vi.resetAllMocks();
});

describe('useMyPhotos', () => {
  test('받는 동안은 loading이고 사진은 빈 배열이에요', async () => {
    vi.mocked(getMyPhotos).mockReturnValue(deferred().promise);

    await mount();

    expect(latest).toEqual({ photos: [], status: 'loading', error: null });
  });

  test('다 받으면 ready와 사진 목록이에요', async () => {
    vi.mocked(getMyPhotos).mockResolvedValue(photosA);

    await mount();

    expect(latest).toEqual({ photos: photosA, status: 'ready', error: null });
    expect(getMyPhotos).toHaveBeenCalledWith('u1');
  });

  test('실패하면 error와 빈 배열이고 던지지 않아요', async () => {
    const error = { status: 0, code: 'LOAD_FAILED', message: 'network down' };
    vi.mocked(getMyPhotos).mockRejectedValue(error);

    await mount();

    expect(latest).toEqual({ photos: [], status: 'error', error });
  });

  test('로그인 전(user 없음)이면 읽지 않고 loading이에요', async () => {
    useAuthStore.setState({ user: null });

    await mount();

    expect(latest.status).toBe('loading');
    expect(getMyPhotos).not.toHaveBeenCalled();
  });

  test('계정이 바뀌면 loading을 거쳐 새 계정의 사진을 줘요(앞 계정 사진은 안 보여요)', async () => {
    const second = deferred();
    vi.mocked(getMyPhotos).mockResolvedValueOnce(photosA).mockReturnValueOnce(second.promise);
    await mount();
    expect(latest.photos).toBe(photosA);

    await act(async () => useAuthStore.setState({ user: { id: 'u2' } }));

    expect(latest).toEqual({ photos: [], status: 'loading', error: null });

    await act(async () => second.resolve(photosB));

    expect(latest.photos).toBe(photosB);
  });

  test('늦게 도착한 앞 계정의 결과는 버려요', async () => {
    const first = deferred();
    vi.mocked(getMyPhotos).mockReturnValueOnce(first.promise).mockResolvedValueOnce(photosB);
    await mount();

    await act(async () => useAuthStore.setState({ user: { id: 'u2' } }));
    await act(async () => first.resolve(photosA));

    expect(latest.photos).toBe(photosB);
  });
});
