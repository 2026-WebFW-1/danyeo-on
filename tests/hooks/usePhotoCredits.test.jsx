import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePhotoCredits } from '@/hooks/usePhotoCredits';
import { getPhotoCredits } from '@/services/creditService';

vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/services/creditService', () => ({ getPhotoCredits: vi.fn() }));

const PHOTOS = [
  { id: 'p_1', fileKey: 'demo:u/seojin/commons-1.webp' },
  { id: 'p_2', fileKey: null },
];
const CREDITS = [{ fileName: 'commons-1.webp', title: 'Seoul' }];

let container;
let root;
let latest;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe() {
  const result = usePhotoCredits();
  useEffect(() => {
    latest = result;
  });
  return null;
}

async function mount(myPhotos) {
  vi.mocked(useMyPhotos).mockReturnValue(myPhotos);
  await act(async () => root.render(<Probe />));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.resetAllMocks();
});

describe('usePhotoCredits', () => {
  test('사진을 받는 동안은 출처를 묻지 않고 loading이에요', async () => {
    await mount({ photos: [], status: 'loading' });

    expect(latest).toEqual({ credits: [], status: 'loading' });
    expect(getPhotoCredits).not.toHaveBeenCalled();
  });

  test('사진을 받으면 fileKey로 출처를 읽어 줘요', async () => {
    vi.mocked(getPhotoCredits).mockResolvedValue(CREDITS);

    await mount({ photos: PHOTOS, status: 'ready' });

    expect(getPhotoCredits).toHaveBeenCalledWith(['demo:u/seojin/commons-1.webp', null]);
    expect(latest).toEqual({ credits: CREDITS, status: 'ready' });
  });

  test('사진이나 출처를 못 받으면 error이고 출처는 빈 배열이에요', async () => {
    await mount({ photos: [], status: 'error' });
    expect(latest).toEqual({ credits: [], status: 'error' });

    vi.mocked(getPhotoCredits).mockRejectedValue(new Error('400'));
    await mount({ photos: PHOTOS, status: 'ready' });
    expect(latest).toEqual({ credits: [], status: 'error' });
  });

  test('사진 목록이 바뀌면 새 출처를 받을 때까지 앞 출처를 내보내지 않아요', async () => {
    vi.mocked(getPhotoCredits).mockResolvedValue(CREDITS);
    await mount({ photos: PHOTOS, status: 'ready' });

    vi.mocked(getPhotoCredits).mockReturnValue(new Promise(() => {}));
    await mount({ photos: [...PHOTOS], status: 'ready' });

    expect(latest).toEqual({ credits: [], status: 'loading' });
  });
});
