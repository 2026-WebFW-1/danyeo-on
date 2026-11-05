import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
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
vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

const tripIdOf = (name) => seojin.trips.find((trip) => trip.name === name).id;

let container;
let root;
let location;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 주소는 effect에서 테스트로 내보내요.
function LocationProbe({ onChange }) {
  const current = useLocation();
  useEffect(() => onChange(`${current.pathname}${current.search}`));
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
