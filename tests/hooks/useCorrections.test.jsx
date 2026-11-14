import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useCorrections } from '@/hooks/useCorrections';
import { addCorrection, getCorrections } from '@/services/correctionService';
import { useCorrectionStore } from '@/stores/correctionStore';

vi.mock('@/services/correctionService', () => ({
  getCorrections: vi.fn(),
  addCorrection: vi.fn(),
  removeCorrection: vi.fn(),
}));

const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: 'x' };
const exclude = { id: 'c_a', ownerId: 'u1', type: 'exclude', photoId: 'p_a', createdAt: 'x' };

let container;
let root;
let latest;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe() {
  const result = useCorrections();
  useEffect(() => {
    latest = result;
  });
  return null;
}

const mount = (ui = <Probe />) => act(async () => root.render(ui));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  useCorrectionStore.getState().reset();
  latest = undefined;
  vi.mocked(getCorrections).mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => root.unmount());
  useCorrectionStore.getState().reset();
  vi.resetAllMocks();
});

describe('useCorrections', () => {
  test('아직 안 불렀으면 들어올 때 보정을 불러오고, 목록과 상태를 돌려줘요', async () => {
    vi.mocked(getCorrections).mockResolvedValue([exclude]);

    await mount();

    expect(getCorrections).toHaveBeenCalledTimes(1);
    expect(latest.status).toBe('ready');
    expect(latest.corrections).toEqual([exclude]);
    expect(latest.error).toBeNull();
  });

  test('개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 불러요', async () => {
    await mount(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );

    expect(getCorrections).toHaveBeenCalledTimes(1);
  });

  test('두 컴포넌트가 같이 써도 한 번만 불러요', async () => {
    await mount(
      <>
        <Probe />
        <Probe />
      </>,
    );

    expect(getCorrections).toHaveBeenCalledTimes(1);
  });

  test('이미 받아 둔 상태면 다시 부르지 않아요', async () => {
    await mount();
    await act(async () => root.render(null));
    await mount();

    expect(getCorrections).toHaveBeenCalledTimes(1);
  });

  test('지난번에 실패해서 error로 남아 있으면 들어올 때 한 번 더 불러요', async () => {
    vi.mocked(getCorrections).mockRejectedValueOnce(LOAD_FAILED).mockResolvedValueOnce([]);

    await mount();
    expect(latest.status).toBe('error');
    expect(latest.error).toEqual(LOAD_FAILED);

    await act(async () => root.render(null));
    await mount();

    expect(getCorrections).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe('ready');
  });

  test('계속 실패해도 같은 화면에 머무는 동안은 다시 부르지 않아요', async () => {
    vi.mocked(getCorrections).mockRejectedValue(LOAD_FAILED);

    await mount();
    await mount();

    expect(latest.status).toBe('error');
    expect(getCorrections).toHaveBeenCalledTimes(1);
  });

  test('화면이 열려 있는 동안 처음 상태로 돌아가면(계정 바뀜) 다시 불러요', async () => {
    await mount();

    await act(async () => useCorrectionStore.getState().reset());

    expect(getCorrections).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe('ready');
  });

  test('add로 저장하면 돌려주는 목록에 바로 보여요', async () => {
    vi.mocked(addCorrection).mockResolvedValue();
    await mount();

    let added;
    await act(async () => {
      added = await latest.add({ type: 'exclude', photoId: 'p_b' });
    });

    expect(latest.corrections).toEqual([added]);
  });
});
