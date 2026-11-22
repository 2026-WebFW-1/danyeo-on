import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import PlacesPage from '@/pages/PlacesPage/PlacesPage';
import { getPosts, removePost, savePost } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';
import { formatPostDate } from '@/utils/postForm';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/services/postService', () => ({
  getPosts: vi.fn(),
  removePost: vi.fn(),
  savePost: vi.fn(),
}));

const tripIdOf = (name) => seojin.trips.find((trip) => trip.name === name).id;
// 밴쿠버 · 밴프: 밴쿠버는 챕터, 밴프는 08.25~26 이틀이고 08.26에 글이 있어요.
const BANFF_TRIP = `/places?trip=${tripIdOf('밴쿠버 · 밴프')}`;
const banffPost = seojinSeed.posts.find((post) => post.date === '2025-08-26');
// 부산 · 경주: 두 지점 모두 글이 없어요. 부산은 02.28~03.01이고 03.01에 찍은 사진이 4장이에요.
const BUSAN_TRIP = `/places?trip=${tripIdOf('부산 · 경주')}`;

let container;
let root;

async function render(path) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <PlacesPage />
      </MemoryRouter>,
    ),
  );
  // 글을 받아 오는 요청이 끝나 블록이 다시 그려질 때까지 기다려요.
  await act(async () => {});
}

const blockOf = (city) =>
  [...container.querySelectorAll('section[aria-label="도시별 기록"] > ol > li')].find(
    (li) => li.querySelector('h3')?.textContent === city,
  );
const writeButton = (block) => block.querySelector('button[aria-haspopup="menu"]');
const buttonOf = (block, pattern) =>
  [...block.querySelectorAll('button')].find((button) => pattern.test(button.textContent));
const postsButton = (block) => buttonOf(block, /^글 (보기|접기)/);
const menuItems = (block) => [...block.querySelectorAll('[role="menuitem"]')];
const itemOf = (block, date) =>
  menuItems(block).find((item) => item.textContent.startsWith(formatPostDate(date)));
const editorOf = (block) =>
  block.querySelector('section[aria-label="글 쓰기"], section[aria-label="글 고치기"]');

async function click(element) {
  await act(async () => element.click());
}

async function pick(block, date) {
  await click(writeButton(block));
  await click(itemOf(block, date));
}

/** 사람이 입력한 것처럼 값을 바꿔요. React가 알아채도록 원래 setter로 넣어요. */
async function type(element, value) {
  const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  await act(async () => {
    set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  usePostStore.getState().reset();
  vi.mocked(useJourney).mockReturnValue({ journey: seojin, status: 'ready', error: null });
  vi.mocked(useMyPhotos).mockReturnValue({
    photos: seojinSeed.photos,
    status: 'ready',
    error: null,
  });
  vi.mocked(getPosts).mockResolvedValue(seojinSeed.posts);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  usePostStore.getState().reset();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('PlacesPage [+ 글 쓰기] (#216)', () => {
  test('챕터 지점에는 없고, 글이 있는 지점은 [글 보기 →] 옆에 있어요', async () => {
    await render(BANFF_TRIP);

    const vancouver = blockOf('밴쿠버');
    expect(writeButton(vancouver)).toBeNull();
    expect(vancouver.querySelector('a[href="/chapter/밴쿠버-2025"]')).not.toBeNull();

    const banff = blockOf('밴프');
    expect(postsButton(banff).textContent).toBe('글 보기→');
    expect(writeButton(banff).textContent).toBe('+글 쓰기');
  });

  test('글이 없는 지점은 [+ 글 쓰기]만 있어요', async () => {
    await render(BUSAN_TRIP);

    const busan = blockOf('부산');
    expect(postsButton(busan)).toBeUndefined();
    expect(writeButton(busan)).not.toBeNull();
  });

  test('날짜 목록은 그 지점에 머문 날이고, 열면 글 없는 첫날에 포커스가 가요', async () => {
    await render(BANFF_TRIP);
    const banff = blockOf('밴프');

    await click(writeButton(banff));

    expect(menuItems(banff).map((item) => item.textContent)).toEqual([
      `${formatPostDate('2025-08-25')}Day 1`,
      `${formatPostDate('2025-08-26')}Day 2글 있음`,
    ]);
    expect(document.activeElement).toBe(itemOf(banff, '2025-08-25'));
  });

  test('글 없는 날을 고르면 글 칸 안에 빈 편집기가 열리고, 저장하면 [글 보기]와 한 줄 글에 바로 보여요', async () => {
    await render(BUSAN_TRIP);

    await pick(blockOf('부산'), '2025-03-01');

    const editor = editorOf(blockOf('부산'));
    expect(editor.getAttribute('aria-label')).toBe('글 쓰기');
    expect(document.activeElement).toBe(editor);
    expect(editor.textContent).toContain(`${formatPostDate('2025-03-01')} · Day 2`);
    expect(editor.querySelector('input[name="title"]').value).toBe('');
    // 그날(03.01) 찍은 부산 사진 4장만 고르기 칸에 나와요
    expect(editor.querySelectorAll('button[aria-pressed]')).toHaveLength(4);

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await type(editor.querySelector('input[name="title"]'), '해운대 아침');
    await type(editor.querySelector('textarea[name="body"]'), '바다가 생각보다 따뜻해 보였다.');
    await click(buttonOf(editor, /^저장$/));
    await act(async () => vi.advanceTimersByTime(1000));

    expect(savePost).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2025-03-01', title: '해운대 아침' }),
    );
    const busan = blockOf('부산');
    expect(editorOf(busan)).toBeNull();
    expect(busan.textContent).toContain('바다가 생각보다 따뜻해 보였다.');

    await click(postsButton(busan));
    expect(busan.querySelector('h4').textContent).toBe('해운대 아침');
  });

  test('글 있는 날을 고쳐 저장하면 같은 글이 고쳐지고, [글 보기]에 고친 제목이 보여요', async () => {
    await render(BANFF_TRIP);

    await pick(blockOf('밴프'), '2025-08-26');

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const editor = editorOf(blockOf('밴프'));
    await type(editor.querySelector('input[name="title"]'), '모레인 호수, 다시');
    await click(buttonOf(editor, /^저장$/));
    await act(async () => vi.advanceTimersByTime(1000));

    // 하루에 글 하나라서 새 글이 아니라 그 글(같은 id)이 고쳐져요
    expect(savePost).toHaveBeenCalledWith(
      expect.objectContaining({ id: banffPost.id, date: '2025-08-26', title: '모레인 호수, 다시' }),
    );
    const banff = blockOf('밴프');
    expect(editorOf(banff)).toBeNull();

    await click(postsButton(banff));
    expect([...banff.querySelectorAll('h4')].map((h4) => h4.textContent)).toEqual([
      '모레인 호수, 다시',
    ]);
  });

  test('[취소]를 누르면 저장하지 않고 편집기를 닫아요', async () => {
    await render(BANFF_TRIP);

    await pick(blockOf('밴프'), '2025-08-25');
    await click(buttonOf(editorOf(blockOf('밴프')), /^취소$/));

    expect(editorOf(blockOf('밴프'))).toBeNull();
    expect(savePost).not.toHaveBeenCalled();
  });

  test('글 있는 날을 고르면 그 글로 열리고, [글 지우기]로 지우면 [글 보기]에서 빠져요', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await render(BANFF_TRIP);

    await pick(blockOf('밴프'), '2025-08-26');

    const editor = editorOf(blockOf('밴프'));
    expect(editor.getAttribute('aria-label')).toBe('글 고치기');
    expect(editor.querySelector('input[name="title"]').value).toBe(banffPost.title);

    await click(buttonOf(editor, /^글 지우기$/));
    await act(async () => {});

    expect(removePost).toHaveBeenCalledWith(banffPost.id);
    const banff = blockOf('밴프');
    expect(editorOf(banff)).toBeNull();
    expect(postsButton(banff)).toBeUndefined();

    await click(writeButton(banff));
    expect(itemOf(banff, '2025-08-26').textContent).not.toContain('글 있음');
  });

  test('글 목록과 편집기는 한 번에 하나만 열려요', async () => {
    await render(BANFF_TRIP);
    const banff = blockOf('밴프');

    await click(postsButton(banff));
    expect(banff.querySelector('h4')).not.toBeNull();

    // 날짜를 고르면 글 목록을 닫아요
    await pick(banff, '2025-08-25');
    expect(banff.querySelector('h4')).toBeNull();
    expect(editorOf(banff)).not.toBeNull();

    // 편집 중에 [글 보기]를 누르면 편집기를 닫고 목록을 열어요
    await click(postsButton(banff));
    expect(editorOf(banff)).toBeNull();
    expect(banff.querySelector('h4')).not.toBeNull();
  });
});
