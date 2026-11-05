import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test } from 'vitest';

import NoTripsNotice from '@/components/common/NoTripsNotice';

let container;
let root;

async function render(props) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <NoTripsNotice {...props} />
      </MemoryRouter>,
    ),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

test('15a와 같은 문구와 [사진 올리기] 링크를 보여 줘요', async () => {
  await render();

  expect(container.querySelector('h2').textContent).toBe('아직 여행이 없어요');
  expect(container.textContent).toContain('사진을 올리면 촬영 시각과 위치로');
  expect(container.textContent).toContain('여행을 만들어 지도에 그려 드려요');
  expect(container.querySelector('a').getAttribute('href')).toBe('/upload');
  expect(container.querySelector('a').textContent).toBe('사진 올리기');
});

test('부르는 쪽이 넘긴 className으로 모양을 바꿀 수 있어요', async () => {
  await render({ className: 'mt-10 w-100' });

  const card = container.querySelector('section');
  expect(card.className).toContain('mt-10');
  // 같은 종류(너비)는 부르는 쪽 값이 기본값을 덮어써요.
  expect(card.className).toContain('w-100');
  expect(card.className).not.toContain('w-130');
});
