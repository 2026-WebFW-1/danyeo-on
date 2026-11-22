import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useDismissedTransits } from '@/hooks/useDismissedTransits';
import { useAuthStore } from '@/stores/authStore';

const keyOf = (userId) => `danyeo-on:transit-dismissed:${userId}`;
const savedOf = (userId) => JSON.parse(localStorage.getItem(keyOf(userId)));

let container;
let root;
let latest;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ onResult }) {
  const result = useDismissedTransits();
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

const dismiss = (stopId) => act(async () => latest[1](stopId));
const switchUser = (id) => act(async () => useAuthStore.setState({ user: { id } }));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  useAuthStore.setState({ user: { id: 'u1' } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe('useDismissedTransits', () => {
  test('닫은 지점을 계정별로 브라우저에 남기고, 다시 들어오면 읽어요', async () => {
    await mount();
    expect(latest[0]).toEqual([]);

    await dismiss('p_a');

    expect(latest[0]).toEqual(['p_a']);
    expect(savedOf('u1')).toEqual(['p_a']);

    await act(async () => root.unmount());
    root = createRoot(container);
    await mount();

    expect(latest[0]).toEqual(['p_a']);
  });

  test('화면이 떠 있는 채로 계정이 바뀌면 그 계정의 목록을 읽고, 앞 계정의 목록을 섞어 쓰지 않아요', async () => {
    localStorage.setItem(keyOf('u2'), JSON.stringify(['p_x']));
    await mount();
    await dismiss('p_a');

    await switchUser('u2');

    expect(latest[0]).toEqual(['p_x']);

    await dismiss('p_y');

    expect(latest[0]).toEqual(['p_x', 'p_y']);
    expect(savedOf('u2')).toEqual(['p_x', 'p_y']);
    expect(savedOf('u1')).toEqual(['p_a']);
  });

  test('저장된 값이 깨져 있으면 닫은 게 없는 것으로 봐요', async () => {
    localStorage.setItem(keyOf('u1'), '{깨진 값');
    await mount();

    expect(latest[0]).toEqual([]);
  });
});
