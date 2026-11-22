import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import PostPhotoPicker from '@/components/post/PostPhotoPicker';

const PHOTOS = [
  { id: 'p_a', fileKey: 'public:/photos/vancouver-1.webp', fileName: 'A.JPG' },
  { id: 'p_b', fileKey: 'public:/photos/vancouver-2.webp', fileName: 'B.JPG' },
  { id: 'p_c', fileKey: null, fileName: 'C.JPG' },
];

let container;
let root;
let onChange;

const render = (props) =>
  act(async () =>
    root.render(
      <PostPhotoPicker photos={PHOTOS} isDisabled={false} onChange={onChange} {...props} />,
    ),
  );
const findButton = (label) => container.querySelector(`button[aria-label="${label}"]`);
const photoLabels = () =>
  [...container.querySelectorAll('button[aria-pressed]')].map((button) =>
    button.getAttribute('aria-label'),
  );
const click = (element) => act(async () => element.click());

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  onChange = vi.fn();
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('PostPhotoPicker', () => {
  test('고른 사진이 그 순서로 앞에, 안 고른 사진이 뒤에 보여요', async () => {
    // when
    await render({ selectedIds: ['p_c', 'p_a'] });

    // then
    expect(photoLabels()).toEqual(['사진 C.JPG 빼기', '사진 A.JPG 빼기', '사진 B.JPG 넣기']);
    expect(findButton('사진 C.JPG 빼기').getAttribute('aria-pressed')).toBe('true');
    expect(findButton('사진 B.JPG 넣기').getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });

  test('고른 사진을 누르면 빼요', async () => {
    // given
    await render({ selectedIds: ['p_a', 'p_b'] });

    // when
    await click(findButton('사진 A.JPG 빼기'));

    // then
    expect(onChange).toHaveBeenCalledWith(['p_b']);
  });

  test('안 고른 사진을 누르면 맨 뒤에 넣어요', async () => {
    // given
    await render({ selectedIds: ['p_b'] });

    // when
    await click(findButton('사진 A.JPG 넣기'));

    // then
    expect(onChange).toHaveBeenCalledWith(['p_b', 'p_a']);
  });

  test('← →로 한 칸씩 옮기고, 맨 앞의 ←와 맨 뒤의 →는 꺼져요', async () => {
    // given
    await render({ selectedIds: ['p_a', 'p_b'] });

    // then
    expect(findButton('A.JPG 앞으로').disabled).toBe(true);
    expect(findButton('B.JPG 뒤로').disabled).toBe(true);

    // when
    await click(findButton('A.JPG 뒤로'));

    // then
    expect(onChange).toHaveBeenLastCalledWith(['p_b', 'p_a']);

    // when
    await click(findButton('B.JPG 앞으로'));

    // then
    expect(onChange).toHaveBeenLastCalledWith(['p_b', 'p_a']);
  });

  test('안 고른 사진에는 ← →가 없어요', async () => {
    // when
    await render({ selectedIds: ['p_a'] });

    // then
    expect(findButton('B.JPG 앞으로')).toBeNull();
    expect(findButton('B.JPG 뒤로')).toBeNull();
  });

  test('사진 파일이 없는 사진도 회색 칸으로 고를 수 있어요', async () => {
    // given
    await render({ selectedIds: ['p_a'] });

    // when
    await click(findButton('사진 C.JPG 넣기'));

    // then
    expect(findButton('사진 C.JPG 넣기').querySelector('img')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(['p_a', 'p_c']);
  });

  test('고른 사진이 한 장 남으면 뺄 수 없어요', async () => {
    // when
    await render({ selectedIds: ['p_b'] });

    // then
    expect(findButton('사진 B.JPG 빼기').disabled).toBe(true);
    expect(findButton('사진 A.JPG 넣기').disabled).toBe(false);
  });

  test('넣거나 옮겨도 누른 사진 버튼에 포커스가 남아요', async () => {
    // given
    document.body.append(container);
    let selectedIds = ['p_a'];
    onChange.mockImplementation((ids) => {
      selectedIds = ids;
    });
    await render({ selectedIds });
    const buttonB = findButton('사진 B.JPG 넣기');
    buttonB.focus();

    // when
    await click(buttonB);
    await render({ selectedIds });

    // then
    expect(document.activeElement).toBe(buttonB);
    expect(buttonB.getAttribute('aria-pressed')).toBe('true');
    container.remove();
  });

  test('isDisabled면 모든 버튼이 꺼져요', async () => {
    // when
    await render({ selectedIds: ['p_a', 'p_b'], isDisabled: true });

    // then
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });
});
