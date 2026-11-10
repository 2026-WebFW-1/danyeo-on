import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useJourney } from '@/hooks/useJourney';
import { getJourney } from '@/services/journeyService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/services/journeyService', () => ({ getJourney: vi.fn() }));

const journeyA = { home: { city: 'A' }, stops: [], legs: [], trips: [], periods: null };
const journeyB = { home: { city: 'B' }, stops: [], legs: [], trips: [], periods: null };
const LOADING = { journey: null, status: 'loading', error: null };

let container;
let root;
let latest;

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ onResult }) {
  const result = useJourney();
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
  useAuthStore.setState({ user: { id: 'u1', email: 'seojin@demo.local', name: '윤서진' } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  useAuthStore.setState({ user: null });
  vi.resetAllMocks();
});

describe('useJourney', () => {
  test('로그인한 계정의 id로 읽어서 ready와 Journey를 줘요', async () => {
    vi.mocked(getJourney).mockResolvedValue(journeyA);

    await mount();

    expect(latest).toEqual({ journey: journeyA, status: 'ready', error: null });
    expect(getJourney).toHaveBeenCalledWith('u1');
  });

  test('실패하면 error를 주고 던지지 않아요', async () => {
    const error = { status: 0, code: 'LOAD_FAILED', message: 'network down' };
    vi.mocked(getJourney).mockRejectedValue(error);

    await mount();

    expect(latest).toEqual({ journey: null, status: 'error', error });
  });

  test('로그인 전(user 없음)이면 읽지 않고 loading이에요', async () => {
    useAuthStore.setState({ user: null });

    await mount();

    expect(latest).toEqual(LOADING);
    expect(getJourney).not.toHaveBeenCalled();
  });

  test('계정이 바뀌면 loading을 거쳐 새 계정의 Journey를 줘요(앞 계정 값은 안 보여요)', async () => {
    const second = deferred();
    vi.mocked(getJourney).mockResolvedValueOnce(journeyA).mockReturnValueOnce(second.promise);
    await mount();
    expect(latest.journey).toBe(journeyA);

    await act(async () =>
      useAuthStore.setState({ user: { id: 'u2', email: 'edge@demo.local', name: '엣지' } }),
    );

    expect(latest).toEqual(LOADING);
    expect(getJourney).toHaveBeenLastCalledWith('u2');

    await act(async () => second.resolve(journeyB));

    expect(latest.journey).toBe(journeyB);
  });
});
