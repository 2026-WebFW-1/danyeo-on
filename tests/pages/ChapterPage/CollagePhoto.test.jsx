import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import CollagePhoto from '@/pages/ChapterPage/CollagePhoto';

const PHOTO = { id: 'p1', fileKey: 'public:/photos/tokyo-1.webp' };

let container;
let root;

const render = (ui) => act(async () => root.render(ui));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('CollagePhoto', () => {
  test('작은 칸에는 thumb 사진을 그려요', async () => {
    await render(<CollagePhoto photo={PHOTO} onOpen={() => {}} />);

    expect(container.querySelector('img').getAttribute('src')).toBe('/photos/thumb/tokyo-1.webp');
  });

  test('큰 칸(size="full")에는 full 사진을 그려요', async () => {
    await render(<CollagePhoto photo={PHOTO} size="full" onOpen={() => {}} />);

    expect(container.querySelector('img').getAttribute('src')).toBe('/photos/full/tokyo-1.webp');
  });

  test('누르면 onOpen을 불러요', async () => {
    const onOpen = vi.fn();
    await render(<CollagePhoto photo={PHOTO} onOpen={onOpen} />);

    await act(async () => container.querySelector('button').click());

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('이미지 없는 사진(fileKey: null)은 회색 칸이고 그래도 눌러서 열 수 있어요', async () => {
    const onOpen = vi.fn();
    await render(<CollagePhoto photo={{ id: 'p2', fileKey: null }} onOpen={onOpen} />);

    expect(container.querySelector('img')).toBeNull();
    await act(async () => container.querySelector('button').click());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('사진 자체가 없으면(null) 열 게 없어서 버튼 없이 회색 칸만 둬요', async () => {
    await render(<CollagePhoto photo={null} onOpen={() => {}} className="size-full" />);

    expect(container.querySelector('button')).toBeNull();
    expect(container.firstElementChild.className).toContain('bg-line');
  });

  test('이미지를 못 불러오면 깨진 그림 대신 회색 칸이에요', async () => {
    await render(<CollagePhoto photo={PHOTO} onOpen={() => {}} />);

    await act(async () => container.querySelector('img').dispatchEvent(new Event('error')));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('button')).not.toBeNull();
  });

  test('사진이 바뀌면 이전에 못 연 주소를 기억하지 않고 새 사진을 그려요', async () => {
    await render(<CollagePhoto photo={PHOTO} onOpen={() => {}} />);
    await act(async () => container.querySelector('img').dispatchEvent(new Event('error')));

    await render(<CollagePhoto photo={{ id: 'p3', fileKey: 'public:/photos/rome-1.webp' }} />);

    expect(container.querySelector('img').getAttribute('src')).toBe('/photos/thumb/rome-1.webp');
  });
});
