import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import PlacesPage from '@/pages/PlacesPage/PlacesPage';
import { getPosts } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/services/postService', () => ({
  getPosts: vi.fn(),
  removePost: vi.fn(),
  savePost: vi.fn(),
}));

const tripIdOf = (name) => seojin.trips.find((trip) => trip.name === name).id;

let container;
let root;
let location;
let navigate;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 주소는 effect에서 테스트로 내보내요.
function LocationProbe({ onChange }) {
  const current = useLocation();
  useEffect(() => onChange(`${current.pathname}${current.search}`));
  return null;
}

// 뒤로·앞으로 가기(navigate(-1) · navigate(1))를 테스트에서 부를 수 있게 내보내요.
function NavigateProbe() {
  const go = useNavigate();
  useEffect(() => {
    navigate = go;
  });
  return null;
}

async function render(path) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe
          onChange={(path) => {
            location = path;
          }}
        />
        <NavigateProbe />
        <PlacesPage />
      </MemoryRouter>,
    ),
  );
}

const headline = () => container.querySelector('h2')?.textContent;
const tabs = () => [...container.querySelectorAll('nav[aria-label="여행 고르기"] button')];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
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
  usePostStore.getState().reset();
  vi.resetAllMocks();
});

describe('PlacesPage 주소의 ?trip=', () => {
  test('?trip=이 가리키는 여행을 보여 줘요', async () => {
    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(headline()).toBe('밴쿠버 · 밴프');
    expect(tabs().find((tab) => tab.getAttribute('aria-current') === 'true').textContent).toContain(
      '밴쿠버 · 밴프',
    );
  });

  test('?trip=이 없으면 첫 여행이에요', async () => {
    await render('/places');

    expect(headline()).toBe('방콕 · 다낭');
  });

  test('없는 id여도 첫 여행을 보여 줘요(주소는 그대로예요)', async () => {
    await render('/places?trip=nope');

    expect(headline()).toBe('방콕 · 다낭');
    expect(location).toBe('/places?trip=nope');
  });

  test('탭을 누르면 주소의 ?trip=이 바뀌고 그 여행이 보여요', async () => {
    await render('/places');
    const target = tripIdOf('졸업 여행');

    await act(async () =>
      tabs()
        .find((tab) => tab.textContent.includes('졸업 여행'))
        .click(),
    );

    expect(location).toBe(`/places?trip=${target}`);
    expect(headline()).toBe('졸업 여행');
  });

  test('아래의 다음 여행 버튼을 눌러도 주소가 바뀌어요', async () => {
    await render('/places');

    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((b) => b.textContent.includes('NEXT TRIP'))
        .click(),
    );

    expect(location).toBe(`/places?trip=${seojin.trips[1].id}`);
  });
});

describe('PlacesPage 여행이 바뀌면 보이는 자리 (#238)', () => {
  let scrollIntoView;

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const tabRow = () => container.querySelector('nav[aria-label="여행 고르기"]');
  // scrollIntoView를 부른 요소예요. 여행 탭 줄이어야 해요.
  const scrolledTo = () => scrollIntoView.mock.contexts.at(-1);

  async function click(element) {
    await act(async () => element.click());
  }

  test('?trip= 없이 들어오면(위쪽 메뉴 Places) 맨 위 큰 제목부터 보여요', async () => {
    await render('/places');

    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  test('?trip=으로 들어오면(다른 화면의 "이 여행 보기" 링크) 여행 탭 줄이 화면 맨 위에 와요', async () => {
    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(scrolledTo()).toBe(tabRow());
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'start' });
  });

  test('탭을 누르면 여행 탭 줄이 화면 맨 위에 와요', async () => {
    await render('/places');
    window.scrollTo.mockClear();

    await click(tabs().find((tab) => tab.textContent.includes('졸업 여행')));

    expect(headline()).toBe('졸업 여행');
    expect(scrolledTo()).toBe(tabRow());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('맨 아래 [NEXT TRIP →] · [← PREV]를 눌러도 여행 탭 줄이 화면 맨 위에 와요', async () => {
    await render('/places');
    const pagerButton = (label) =>
      [...container.querySelectorAll('nav[aria-label="여행 이동"] button')].find((b) =>
        b.textContent.includes(label),
      );

    await click(pagerButton('NEXT TRIP'));
    expect(headline()).toBe(seojin.trips[1].name);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrolledTo()).toBe(tabRow());

    await click(pagerButton('PREV'));
    expect(headline()).toBe(seojin.trips[0].name);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrolledTo()).toBe(tabRow());
  });

  test('뒤로 · 앞으로 가기로 바뀌면 스크롤하지 않아요(브라우저가 전에 보던 자리로 돌려놔요)', async () => {
    await render('/places');
    const current = tabs().find((tab) => tab.getAttribute('aria-current') === 'true');

    // 지금 고른 탭을 다시 누르면 여행은 같고 주소에 ?trip=만 붙은 기록이 하나 더 생겨요
    await click(current);
    expect(location).toBe(`/places?trip=${seojin.trips[0].id}`);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    window.scrollTo.mockClear();
    scrollIntoView.mockClear();

    await act(async () => navigate(-1));
    expect(location).toBe('/places');
    await act(async () => navigate(1));
    expect(location).toBe(`/places?trip=${seojin.trips[0].id}`);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();

    // 다른 여행으로 갔다가 뒤로 가도 같아요
    await click(
      [...container.querySelectorAll('nav[aria-label="여행 이동"] button')].find((b) =>
        b.textContent.includes('NEXT TRIP'),
      ),
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    window.scrollTo.mockClear();
    scrollIntoView.mockClear();
    await act(async () => navigate(-1));
    expect(headline()).toBe(seojin.trips[0].name);

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  test('받는 중에는 탭 줄이 없어서 맨 위로 가고, 다 받으면 탭 줄로 가요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: null, status: 'loading', error: null });
    const path = `/places?trip=${tripIdOf('밴쿠버 · 밴프')}`;

    await render(path);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 });
    expect(scrollIntoView).not.toHaveBeenCalled();

    vi.mocked(useJourney).mockReturnValue({ journey: seojin, status: 'ready', error: null });
    await render(path);
    expect(scrolledTo()).toBe(tabRow());
  });
});

describe('PlacesPage 로딩과 오류', () => {
  test('여행 기록을 받는 중이면 안내만 보여 줘요(첫 여행을 고르지 않아요)', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: null, status: 'loading', error: null });

    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(container.querySelector('[role="status"]').textContent).toContain('불러오는 중');
    expect(container.querySelector('h2')).toBeNull();
  });

  test('받지 못하면 오류 안내를 보여 줘요', async () => {
    vi.mocked(useJourney).mockReturnValue({
      journey: null,
      status: 'error',
      error: { status: 0, code: 'LOAD_FAILED', message: 'x' },
    });

    await render('/places');

    expect(container.querySelector('[role="alert"]').textContent).toContain('불러오지 못했어요');
  });
});

describe('PlacesPage 글과 사진', () => {
  test('화면이 열리면 글을 한 번 불러와서 한 줄 글로 보여 줘요', async () => {
    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(getPosts).toHaveBeenCalledTimes(1);
    const firstPost = seojinSeed.posts.find((post) => post.date === '2025-06-28');
    expect(container.textContent).toContain(firstPost.body.slice(0, 12));
  });

  test('개발 모드(StrictMode)에서 effect가 두 번 돌아도 글은 한 번만 불러요', async () => {
    await act(async () =>
      root.render(
        <StrictMode>
          <MemoryRouter initialEntries={['/places']}>
            <PlacesPage />
          </MemoryRouter>
        </StrictMode>,
      ),
    );

    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('이미 글을 받아 둔 상태면 다시 부르지 않아요', async () => {
    await render('/places');
    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('글을 못 받아도 도시 블록은 그려요', async () => {
    vi.mocked(getPosts).mockRejectedValue({ status: 0, code: 'LOAD_FAILED', message: 'x' });

    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(container.querySelectorAll('section[aria-label="도시별 기록"] ol > li')).toHaveLength(2);
    expect(usePostStore.getState().status).toBe('error');
  });

  test('글을 못 받았어도 화면에 다시 들어오면 한 번 더 불러와요', async () => {
    vi.mocked(getPosts)
      .mockRejectedValueOnce({ status: 0, code: 'LOAD_FAILED', message: 'x' })
      .mockResolvedValueOnce(seojinSeed.posts);
    const path = `/places?trip=${tripIdOf('밴쿠버 · 밴프')}`;

    await render(path);
    expect(usePostStore.getState().status).toBe('error');

    // 다른 화면에 갔다가 돌아온 것처럼 화면을 내렸다가 다시 그려요.
    await act(async () => root.render(null));
    await render(path);

    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(usePostStore.getState().status).toBe('ready');
    const firstPost = seojinSeed.posts.find((post) => post.date === '2025-06-28');
    expect(container.textContent).toContain(firstPost.body.slice(0, 12));
  });

  test('화면이 열려 있는 동안 계정이 바뀌어 글이 처음 상태로 돌아가면 다시 불러와요', async () => {
    await render('/places');
    expect(getPosts).toHaveBeenCalledTimes(1);

    await act(async () => usePostStore.getState().reset());

    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(usePostStore.getState().status).toBe('ready');
  });

  test('글을 못 받아도 같은 화면에 머무는 동안은 다시 부르지 않아요', async () => {
    vi.mocked(getPosts).mockRejectedValue({ status: 0, code: 'LOAD_FAILED', message: 'x' });

    await render('/places');
    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);

    expect(usePostStore.getState().status).toBe('error');
    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('사진을 못 받아도(빈 목록) 대표 사진 한 장으로 크게 볼 수 있어요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'error', error: { code: 'x' } });

    await render(`/places?trip=${tripIdOf('밴쿠버 · 밴프')}`);
    await act(async () =>
      container.querySelector('button[aria-label="밴쿠버 사진 크게 보기"]').click(),
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="다음 사진"]')).toBeNull();
  });
});

describe('PlacesPage 여행이 없을 때', () => {
  test('빈 계정이면 안내만 보여 줘요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: empty, status: 'ready', error: null });
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'ready', error: null });
    vi.mocked(getPosts).mockResolvedValue([]);

    await render('/places');

    expect(container.textContent).toContain('아직 여행이 없어요');
    expect(container.querySelector('nav[aria-label="여행 고르기"]')).toBeNull();
  });
});
