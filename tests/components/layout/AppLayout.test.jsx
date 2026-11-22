import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, test } from 'vitest';

import AppLayout from '@/components/layout/AppLayout';
import { usePostStore } from '@/stores/postStore';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  usePostStore.getState().reset();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test('어느 페이지에서든 화면 뒤 데이터가 실패하면 15b 토스트가 떠요', async () => {
  // given
  usePostStore.setState({
    status: 'error',
    error: { status: 0, code: 'LOAD_FAILED', message: 'x' },
  });

  // when
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/passport']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="passport" element={<p>여권</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    ),
  );

  // then
  expect(container.textContent).toContain('여권');
  expect(container.querySelector('[role="alert"]').textContent).toContain(
    '서버에 연결하지 못했어요',
  );
});
