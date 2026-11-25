import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import CollagePhoto from '@/pages/ChapterPage/CollagePhoto';
import NoteCard from '@/pages/ChapterPage/NoteCard';
import PostCard from '@/pages/ChapterPage/PostCard';
import Sticker from '@/pages/ChapterPage/Sticker';
import '@/styles/global.css';

// 콜라주 조각 위 마우스 커서(#278): 손가락 = 고치기, 돋보기 = 크게 보기, 화살표 = 보기만.
// 실제 스타일(global.css)을 읽고, 조각 가운데에 마우스를 올렸을 때 맨 위에 있는 요소의 커서를 봐요.

const PHOTO = { id: 'p1', fileKey: 'public:/photos/tokyo-1.webp' };
const POST = {
  id: 'post_1',
  date: '2025-07-12',
  title: '카필라노 흔들다리',
  body: '다리 위에서는 걸음이 저절로 느려졌다.',
};

let container;
let root;

const render = (ui) => act(async () => root.render(ui));

const cursorAt = (element) => {
  const rect = element.getBoundingClientRect();
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return getComputedStyle(top).cursor;
};

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  container.style.width = '300px';
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('콜라주 조각 위 마우스 커서 (#278)', () => {
  test('사진별 글 메모 카드는 누를 수 없어서 화살표예요', async () => {
    await render(<NoteCard text="수상비행기 터미널 앞에서" />);

    expect(cursorAt(container.querySelector('p'))).toBe('default');
  });

  test('스티커는 누를 수 없어서 화살표예요', async () => {
    await render(<Sticker label="개스타운" size="medium" />);

    expect(cursorAt(container.querySelector('span'))).toBe('default');
  });

  test('제목 없는 글의 메모 카드는 눌러서 고칠 수 있어서 손가락이에요', async () => {
    await render(<NoteCard text="제목 없이 적은 짧은 글" date="2025-07-01" onEdit={() => {}} />);

    expect(cursorAt(container.querySelector('p'))).toBe('pointer');
  });

  test('글 카드는 눌러서 고칠 수 있어서 손가락이에요', async () => {
    await render(<PostCard post={POST} onEdit={() => {}} />);

    expect(cursorAt(container.querySelector('h2'))).toBe('pointer');
  });

  test('사진은 눌러서 크게 볼 수 있어서 돋보기예요', async () => {
    await render(<CollagePhoto photo={PHOTO} onOpen={() => {}} className="size-40" />);

    expect(cursorAt(container.querySelector('button'))).toBe('zoom-in');
  });
});
