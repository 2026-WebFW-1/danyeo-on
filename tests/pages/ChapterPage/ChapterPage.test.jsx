import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import seojinSeed from '@/data/seed/seojin.json';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import ChapterPage from '@/pages/ChapterPage/ChapterPage';
import { getPhotoNotes } from '@/services/noteService';
import { getPosts } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';
import { getNextStop } from '@/utils/chapters';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));
vi.mock('@/services/noteService', () => ({ getPhotoNotes: vi.fn() }));

const VANCOUVER = '/chapter/밴쿠버-2025';
const vancouver = seojin.stops.find((stop) => stop.slug === '밴쿠버-2025');
const LOAD_FAILED = { status: 0, code: 'LOAD_FAILED', message: 'x' };

// 밴쿠버 다음 지점(밴프)도 챕터인 여행이에요. 챕터에서 챕터로 넘어가는 경우를 보려고 고쳐 만들었어요.
const nextOfVancouver = getNextStop(seojin, vancouver.id);
const withChapterNext = {
  ...seojin,
  stops: seojin.stops.map((stop) =>
    stop.id === nextOfVancouver.id ? { ...stop, chapter: true, slug: '밴프-2025' } : stop,
  ),
};

let container;
let root;
let location;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 주소는 effect에서 테스트로 내보내요.
function LocationProbe({ onChange }) {
  const current = useLocation();
  useEffect(() => onChange(`${current.pathname}${current.search}`));
  return null;
}

function Tree({ path }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe
        onChange={(next) => {
          location = next;
        }}
      />
      <Routes>
        <Route path="/chapter/:slug" element={<ChapterPage />} />
        <Route path="/places" element={<p>03 전체 기록</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// 글 → 사진별 글 순서로 이어서 읽어서, 이어지는 요청이 다 끝나도록 한 번 더 기다려요.
// 콜라주 폭을 ResizeObserver가 그린 뒤에 알려 주니, 그 알림으로 다시 그려질 때까지 프레임도 둘 기다려요.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextFrame();
    await nextFrame();
  });
}

async function render(path = VANCOUVER, wrap = (tree) => tree) {
  await act(async () => root.render(wrap(<Tree path={path} />)));
  await settle();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const headline = () => container.querySelector('h1')?.textContent;
const titles = () => [...container.querySelectorAll('article h2')].map((h2) => h2.textContent);
const memoTexts = () => [...container.querySelectorAll('p.line-clamp-4')].map((p) => p.textContent);
const photoButtons = () => [...container.querySelectorAll('button[aria-label="사진 크게 보기"]')];
const dialog = () => container.querySelector('[role="dialog"]');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  usePostStore.getState().reset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(useJourney).mockReturnValue({ journey: seojin, status: 'ready', error: null });
  vi.mocked(useMyPhotos).mockReturnValue({
    photos: seojinSeed.photos,
    status: 'ready',
    error: null,
  });
  vi.mocked(getPosts).mockResolvedValue(seojinSeed.posts);
  vi.mocked(getPhotoNotes).mockImplementation(async (ids) =>
    ids.map((id) => ({ photoId: id, body: `사진 ${id}의 글` })),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  usePostStore.getState().reset();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('ChapterPage 챕터 찾기', () => {
  test('주소의 slug로 챕터를 찾아 그려요', async () => {
    await render();

    expect(headline()).toBe('밴쿠버에서 보낸 57일');
    expect(titles()).toHaveLength(3);
  });

  test('주소가 인코딩되어 들어와도(%EB…) 같은 챕터를 찾아요', async () => {
    await render(`/chapter/${encodeURIComponent('밴쿠버-2025')}`);

    expect(headline()).toBe('밴쿠버에서 보낸 57일');
  });

  test('없는 주소면 03 전체 기록으로 보내고, 데이터를 더 읽지 않아요', async () => {
    await render('/chapter/없는-주소');

    expect(location).toBe('/places');
    expect(container.textContent).toContain('03 전체 기록');
    expect(getPhotoNotes).not.toHaveBeenCalled();
  });

  test('챕터가 아닌 지점의 주소도 03으로 보내요', async () => {
    // 밴프는 14일을 안 채워서 slug가 없어요. 데이터에 없는 주소라서 같은 길로 가요
    await render('/chapter/밴프-2025');

    expect(location).toBe('/places');
  });

  test('여행 기록을 받는 동안은 없다고 판단하지 않고 안내만 보여 줘요(03으로 튕기지 않아요)', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: null, status: 'loading', error: null });

    await render();

    expect(container.querySelector('[role="status"]').textContent).toContain('불러오는 중');
    expect(location).toBe(VANCOUVER);
    expect(headline()).toBeUndefined();
  });

  test('여행 기록을 못 받으면 오류 안내만 보여 줘요', async () => {
    vi.mocked(useJourney).mockReturnValue({
      journey: null,
      status: 'error',
      error: { status: 0, code: 'LOAD_FAILED', message: 'x' },
    });

    await render();

    expect(container.querySelector('[role="alert"]').textContent).toContain('불러오지 못했어요');
    expect(location).toBe(VANCOUVER);
  });

  test('사진을 못 받으면 오류 안내만 보여 줘요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'error', error: LOAD_FAILED });

    await render();

    expect(container.querySelector('[role="alert"]').textContent).toContain('불러오지 못했어요');
    expect(headline()).toBeUndefined();
  });
});

describe('ChapterPage 글과 사진별 글', () => {
  test('사진·글·사진별 글을 받는 동안은 안내만 보여 주고, 다 받으면 그려요', async () => {
    const notes = deferred();
    vi.mocked(getPhotoNotes).mockReturnValue(notes.promise);

    await render();
    expect(container.querySelector('[role="status"]').textContent).toContain('불러오는 중');
    expect(headline()).toBeUndefined();

    await act(async () => notes.resolve([]));

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(headline()).toBe('밴쿠버에서 보낸 57일');
  });

  test('글을 받는 동안에도 안내만 보여 줘요(사진별 글은 글과 같이 읽어요)', async () => {
    const posts = deferred();
    vi.mocked(getPosts).mockReturnValue(posts.promise);

    await render();
    expect(headline()).toBeUndefined();
    expect(getPhotoNotes).toHaveBeenCalledTimes(1);

    await act(async () => posts.resolve(seojinSeed.posts));
    await settle();

    expect(headline()).toBe('밴쿠버에서 보낸 57일');
    expect(getPhotoNotes).toHaveBeenCalledTimes(1);
  });

  test('지점의 사진 전부의 글을 한 번에 읽어요', async () => {
    await render();

    expect(getPhotoNotes).toHaveBeenCalledTimes(1);
    const [ids] = vi.mocked(getPhotoNotes).mock.calls[0];
    expect(ids.toSorted()).toEqual(vancouver.photoIds.toSorted());
  });

  test('읽은 사진별 글이 메모 카드로 그려져요', async () => {
    await render();

    const [ids] = vi.mocked(getPhotoNotes).mock.calls[0];
    // 메모 카드 칸은 둘이라, 읽은 사진별 글 중 둘만 그려져요
    expect(memoTexts()).toHaveLength(2);
    expect(memoTexts().every((text) => ids.some((id) => text === `사진 ${id}의 글`))).toBe(true);
  });

  test('사진별 글을 못 읽으면 메모 카드만 빼고 나머지는 그대로 그려요', async () => {
    vi.mocked(getPhotoNotes).mockRejectedValue(LOAD_FAILED);

    await render();

    expect(headline()).toBe('밴쿠버에서 보낸 57일');
    expect(memoTexts()).toEqual([]);
    expect(titles()).toHaveLength(3);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('글을 못 받아도 사진은 그려요(글 카드만 빠져요)', async () => {
    vi.mocked(getPosts).mockRejectedValue(LOAD_FAILED);

    await render();

    expect(usePostStore.getState().status).toBe('error');
    expect(headline()).toBe('밴쿠버에서 보낸 57일');
    expect(titles()).toEqual([]);
    expect(photoButtons().length).toBeGreaterThan(0);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('개발 모드(StrictMode)에서 effect가 두 번 돌아도 글도 사진별 글도 한 번만 불러요', async () => {
    await render(VANCOUVER, (tree) => <StrictMode>{tree}</StrictMode>);

    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(getPhotoNotes).toHaveBeenCalledTimes(1);
  });

  test('이미 글을 받아 둔 상태면 글을 다시 부르지 않아요', async () => {
    await render();
    await act(async () => root.render(null));
    await render();

    expect(getPosts).toHaveBeenCalledTimes(1);
  });
});

describe('ChapterPage 사진 크게 보기', () => {
  test('사진을 누르면 크게 보고 Esc로 닫아요', async () => {
    await render();

    await act(async () => photoButtons()[0].click());
    expect(dialog()).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(dialog()).toBeNull();
  });
});

describe('ChapterPage 아래 줄과 이동', () => {
  const continueLink = () => container.querySelector('a[href]:not([aria-hidden])');

  test('다음 지점이 챕터가 아니면 [계속 여행하기]는 03의 그 여행으로 가요', async () => {
    await render();

    expect(continueLink().textContent).toContain('계속 여행하기');
    expect(continueLink().getAttribute('href')).toBe(`/places?trip=${vancouver.tripId}`);
  });

  test('다음 지점이 챕터면 [계속 여행하기]는 그 챕터로 가고 맨 위부터 보여요', async () => {
    vi.mocked(useJourney).mockReturnValue({
      journey: withChapterNext,
      status: 'ready',
      error: null,
    });
    await render();
    expect(continueLink().getAttribute('href')).toBe('/chapter/밴프-2025');
    window.scrollTo.mockClear();

    await act(async () => continueLink().click());
    await settle();

    expect(location).toBe('/chapter/밴프-2025');
    expect(headline()).toBe(`${nextOfVancouver.city}에서 보낸 ${nextOfVancouver.days}일`);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  test('여행의 마지막 지점이면 [전체 기록 보기]로 바뀌어요(edge 런던)', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: edge, status: 'ready', error: null });
    vi.mocked(useMyPhotos).mockReturnValue({
      photos: edgeSeed.photos,
      status: 'ready',
      error: null,
    });
    vi.mocked(getPosts).mockResolvedValue(edgeSeed.posts);
    const london = edge.stops.find((stop) => stop.slug === '런던-2025');

    await render('/chapter/런던-2025');

    expect(headline()).toBe('런던에서 보낸 25일');
    expect(continueLink().textContent).toContain('전체 기록 보기');
    expect(continueLink().getAttribute('href')).toBe(`/places?trip=${london.tripId}`);
  });
});
