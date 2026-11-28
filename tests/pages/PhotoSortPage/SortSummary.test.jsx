import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import SortSummary from '@/pages/PhotoSortPage/SortSummary';

let container;
let root;

const PHOTOS = { total: 333, located: 332, unlocated: 1 };

async function render(props = {}) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <SortSummary
          photos={PHOTOS}
          tripCount={14}
          cityCount={19}
          canDeleteAll
          onDeleteAll={vi.fn()}
          {...props}
        />
      </MemoryRouter>,
    ),
  );
}

async function click(element) {
  await act(async () => element.click());
}

const buttonByText = (text) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);
// 확인 창은 document.body에 그려져서(portal) container 밖에서 찾아요.
const dialog = () => document.querySelector('[role="dialog"]');
const dialogButton = (text) =>
  [...dialog().querySelectorAll('button')].find((button) => button.textContent === text);
const alert = () => container.querySelector('[role="alert"]');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

test('[사진 모두 삭제]를 누르면 장수와 함께 지워지는 것을 묻고, 묻는 동안에는 지우지 않아요', async () => {
  // given
  const onDeleteAll = vi.fn();
  await render({ onDeleteAll });

  // when
  await click(buttonByText('사진 모두 삭제'));

  // then
  expect(dialog().textContent).toContain(
    '올린 사진 333장을 모두 삭제할까요?고친 기록과 쓴 글도 함께 지워지고, 복구할 수 없어요.',
  );
  expect(onDeleteAll).not.toHaveBeenCalled();
});

test('확인 창에서 취소하면 닫고 지우지 않아요', async () => {
  // given
  const onDeleteAll = vi.fn();
  await render({ onDeleteAll });
  await click(buttonByText('사진 모두 삭제'));

  // when
  await click(dialogButton('취소'));

  // then
  expect(dialog()).toBeNull();
  expect(onDeleteAll).not.toHaveBeenCalled();
});

test('[모두 삭제]를 누르면 창을 닫고, 지우는 동안 버튼을 막아요', async () => {
  // given
  let finish;
  const onDeleteAll = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render({ onDeleteAll });
  await click(buttonByText('사진 모두 삭제'));

  // when
  await click(dialogButton('모두 삭제'));

  // then
  expect(dialog()).toBeNull();
  expect(onDeleteAll).toHaveBeenCalledOnce();
  expect(buttonByText('삭제하는 중…').disabled).toBe(true);

  await act(async () => finish());
});

test('지우지 못하면 버튼 아래에 안내를 남기고, 다시 누를 수 있어요', async () => {
  // given
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const onDeleteAll = vi.fn().mockRejectedValue(new Error('storage 실패'));
  await render({ onDeleteAll });
  await click(buttonByText('사진 모두 삭제'));

  // when
  await click(dialogButton('모두 삭제'));

  // then
  expect(alert().textContent).toBe('사진을 모두 지우지 못했어요. 다시 눌러 주세요');
  expect(buttonByText('사진 모두 삭제').disabled).toBe(false);
});

test('보정을 저장하거나 Journey를 계산하는 중이면 버튼을 막아요', async () => {
  // when
  await render({ canDeleteAll: false });

  // then
  expect(buttonByText('사진 모두 삭제').disabled).toBe(true);
});

test('사진이 없으면 버튼을 그리지 않아요', async () => {
  // when
  await render({ photos: { total: 0, located: 0, unlocated: 0 } });

  // then
  expect(buttonByText('사진 모두 삭제')).toBeUndefined();
});
