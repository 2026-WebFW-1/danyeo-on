import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ConfirmDialog from '@/components/common/ConfirmDialog';

let container;
let root;
let opener;
let onConfirm;
let onCancel;

// 확인 창은 document.body에 그려져서(portal) container 밖에서 찾아요.
const dialog = () => document.querySelector('[role="dialog"]');
const button = (text) =>
  [...dialog().querySelectorAll('button')].find((item) => item.textContent === text);

async function render(props = {}) {
  await act(async () =>
    root.render(
      <ConfirmDialog
        isOpen
        title="이 글을 지울까요?"
        description="되돌릴 수 없어요."
        confirmLabel="지우기"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />,
    ),
  );
}

async function press(key) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => document.activeElement.dispatchEvent(event));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  onConfirm = vi.fn();
  onCancel = vi.fn();
  // 초점을 옮기려면 문서에 붙어 있어야 해요.
  opener = document.createElement('button');
  container = document.createElement('div');
  document.body.append(opener, container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  opener.remove();
  container.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('ConfirmDialog', () => {
  test('닫혀 있으면 아무것도 그리지 않아요', async () => {
    await render({ isOpen: false });

    expect(dialog()).toBeNull();
  });

  test('제목과 설명으로 이름 붙은 대화 상자로 보여 줘요', async () => {
    await render();

    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog().getAttribute('aria-labelledby')).textContent).toBe(
      '이 글을 지울까요?',
    );
    expect(document.getElementById(dialog().getAttribute('aria-describedby')).textContent).toBe(
      '되돌릴 수 없어요.',
    );
  });

  test('설명이 없으면 제목만 보여 줘요', async () => {
    await render({ description: undefined });

    expect(dialog().hasAttribute('aria-describedby')).toBe(false);
    expect(dialog().querySelector('p')).toBeNull();
  });

  test('버튼 문구는 쓰는 쪽에서 정하고, 남는 쪽은 기본이 [취소]예요', async () => {
    await render();
    expect(button('취소')).toBeDefined();
    expect(button('지우기')).toBeDefined();

    await render({ confirmLabel: '닫기', cancelLabel: '계속 쓰기' });
    expect(button('계속 쓰기')).toBeDefined();
    expect(button('닫기')).toBeDefined();
  });

  test('확인 버튼을 누르면 onConfirm만 불러요', async () => {
    await render();

    await act(async () => button('지우기').click());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('[취소]를 누르면 onCancel만 불러요', async () => {
    await render();

    await act(async () => button('취소').click());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('Esc를 누르면 onCancel을 불러요', async () => {
    await render();

    await press('Escape');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('뒷배경을 누르면 onCancel을 부르고, 창 안을 누르면 부르지 않아요', async () => {
    await render();

    await act(async () => dialog().click());
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => dialog().parentElement.click());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('열리면 초점이 [취소]에 있어서, Enter를 눌러도 확인되지 않아요', async () => {
    opener.focus();

    await render();

    expect(document.activeElement).toBe(button('취소'));
  });

  test('Tab은 두 버튼 사이만 돌아요', async () => {
    await render();

    await press('Tab');
    expect(document.activeElement).toBe(button('지우기'));

    await press('Tab');
    expect(document.activeElement).toBe(button('취소'));
  });

  test('닫히면 열기 전 곳으로 초점을 돌려줘요', async () => {
    opener.focus();
    await render();

    await render({ isOpen: false });

    expect(document.activeElement).toBe(opener);
  });

  test('되돌릴 수 없는 확인(isDanger)은 확인 버튼을 강조색으로 보여 줘요', async () => {
    await render();
    expect(button('지우기').className).not.toContain('text-accent');

    await render({ isDanger: true });
    expect(button('지우기').className).toContain('text-accent');
    expect(button('취소').className).not.toContain('text-accent');
  });
});
