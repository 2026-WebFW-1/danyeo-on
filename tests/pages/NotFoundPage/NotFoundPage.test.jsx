import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, test } from 'vitest';

import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

let container;
let root;

// App과 같이 맨 끝 path="*"에 걸어서, 없는 주소가 이 화면으로 떨어지는지까지 봐요.
async function render(path) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route index element={<h1>홈</h1>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test('없는 주소에서 주소를 찾을 수 없다는 문구와 [홈으로] 링크를 보여 줘요', async () => {
  await render('/no-such-page');

  expect(container.querySelector('h1').textContent).toBe('주소를 찾을 수 없어요');
  expect(container.textContent).toContain('주소가 잘못됐거나');
  expect(container.textContent).toContain('지워진 화면일 수 있어요');
  expect(container.querySelector('a').getAttribute('href')).toBe('/');
  expect(container.querySelector('a').textContent).toBe('홈으로');
});

test('[홈으로]를 누르면 홈으로 가요', async () => {
  await render('/chapter/seoul/extra');

  await act(async () => container.querySelector('a').click());

  expect(container.querySelector('h1').textContent).toBe('홈');
});
