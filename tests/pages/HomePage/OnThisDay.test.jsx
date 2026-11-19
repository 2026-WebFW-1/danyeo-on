import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePhoto } from '@/hooks/usePhoto';
import OnThisDay from '@/pages/HomePage/OnThisDay';
import { getPosts } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';
import { getStopPath } from '@/utils/stopPath';

vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/hooks/usePhoto', () => ({ usePhoto: vi.fn() }));
vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

// 테스트용 사진 파일은 없어서, 진짜 주소를 쓰면 이미지가 못 열려 회색 칸이 되고 <img>가 사라져요.
// 그 실패가 언제 오느냐에 따라 결과가 달라지지 않게, 늘 열리는 1×1 그림에 어떤 사진인지 #뒤에 붙여 줘요.
const BLANK_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const photoSrc = (fileKey, size) => `${BLANK_IMAGE}#${size}:${fileKey}`;

const photo = (id) => ({ id, fileKey: `public:/photos/${id}.webp` });
// 해마다 11월 중순에 한 지점씩 있는 계정이에요. 사진은 지점마다 여섯 장이고 첫 장이 대표 사진이에요.
const stop = (city, from, to) => {
  const photoIds = Array.from({ length: 6 }, (_, index) => `${city}-${index}`);
  return {
    id: photoIds[0],
    tripId: `trip-${city}`,
    city,
    country: '일본',
    cc: 'JP',
    from: `${from}T10:00:00+09:00`,
    to: `${to}T18:00:00+09:00`,
    days: 3,
    chapter: false,
    slug: null,
    transit: false,
    photoIds,
    photoCount: photoIds.length,
    coverFileKey: `public:/photos/${photoIds[0]}.webp`,
  };
};
const STOPS = [
  stop('교토', '2023-11-18', '2023-11-20'),
  stop('후쿠오카', '2024-11-20', '2024-11-22'),
  stop('오사카', '2025-11-17', '2025-11-19'),
];
const JOURNEY = { stops: STOPS };
const PHOTOS = STOPS.flatMap((item) => item.photoIds.map(photo));
const POSTS = [
  {
    id: 'a',
    date: '2025-11-18',
    title: '오사카 둘째 날',
    body: '먹고 걷고 먹고.',
    tags: [],
    photoIds: [],
  },
];

let container;
let root;

async function render(path, journey = JOURNEY) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <OnThisDay journey={journey} />
      </MemoryRouter>,
    ),
  );
}

const section = () => container.querySelector('section');
const title = () => container.querySelector('h2')?.textContent;
const button = (label) => container.querySelector(`button[aria-label="${label}"]`);
const textOf = (selector) => [...container.querySelectorAll(selector)].map((el) => el.textContent);

async function click(element) {
  await act(async () => element.click());
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  usePostStore.getState().reset();
  vi.mocked(useMyPhotos).mockReturnValue({ photos: PHOTOS, status: 'ready', error: null });
  vi.mocked(getPosts).mockResolvedValue(POSTS);
  vi.mocked(usePhoto).mockImplementation((fileKey, size) =>
    fileKey ? photoSrc(fileKey, size) : null,
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  usePostStore.getState().reset();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('OnThisDay', () => {
  test('가장 최근 해(1년 전)의 지점을 피그마 00b 순서로 보여 줘요', async () => {
    await render('/?today=2026-11-19');

    expect(title()).toBe('오사카, 2025.');
    expect(textOf('section p').slice(0, 3)).toEqual([
      'ONE YEAR AGO',
      'D+2 · 1주년',
      '1년 전 이맘때, 오사카에 있었어요.',
    ]);
    expect(section().textContent).toContain('“ 먹고 걷고 먹고. ”');
    expect(section().textContent).toContain('2025.11.17 — 11.19·3일·사진 6장');
  });

  test('작은 사진은 대표 사진을 뺀 네 장이에요', async () => {
    await render('/?today=2026-11-19');

    const sources = [...container.querySelectorAll('section ul img')].map((img) =>
      img.getAttribute('src'),
    );
    expect(sources).toEqual(
      [1, 2, 3, 4].map((index) => photoSrc(`public:/photos/오사카-${index}.webp`, 'thumb')),
    );
  });

  test('[그날의 글 보기 →]는 그 지점이 가는 곳(03의 그 여행)이에요', async () => {
    await render('/?today=2026-11-19');

    const link = [...container.querySelectorAll('a')].find((a) =>
      a.textContent.includes('그날의 글 보기'),
    );
    expect(link.getAttribute('href')).toBe(getStopPath(STOPS[2]));
  });

  test('그 지점의 글이 없으면 한 줄 글을 빼요', async () => {
    vi.mocked(getPosts).mockResolvedValue([]);

    await render('/?today=2026-11-19');

    expect(section().textContent).not.toContain('“');
  });

  describe('[다른 해 같은 날 ← →]', () => {
    test('←는 더 오래된 해, →는 더 최근 해예요. 끝에 닿으면 그쪽은 눌리지 않아요', async () => {
      await render('/?today=2026-11-19');

      expect(button('더 최근 해 보기').disabled).toBe(true);

      await click(button('더 오래된 해 보기'));
      expect(title()).toBe('후쿠오카, 2024.');
      // 후쿠오카는 2024.11.20에 시작해서 2주년(2026.11.20)이 하루 남았어요.
      expect(textOf('section p').slice(0, 2)).toEqual(['TWO YEARS AGO', 'D-1 · 2주년']);

      await click(button('더 오래된 해 보기'));
      expect(title()).toBe('교토, 2023.');
      expect(button('더 오래된 해 보기').disabled).toBe(true);

      await click(button('더 최근 해 보기'));
      expect(title()).toBe('후쿠오카, 2024.');
    });

    test('걸리는 해가 하나뿐이면 보이지 않아요', async () => {
      await render('/?today=2026-11-19', { stops: [STOPS[2]] });

      expect(title()).toBe('오사카, 2025.');
      expect(section().textContent).not.toContain('다른 해 같은 날');
    });

    test('Journey가 다시 계산되어도 보던 해를 그대로 보여 줘요', async () => {
      await render('/?today=2026-11-19');
      await click(button('더 오래된 해 보기'));

      // 사진을 더 올리면 지점 id(첫 사진 id)가 바뀔 수 있어요. 그래도 2년 전을 보고 있어야 해요.
      const recomputed = { stops: STOPS.map((item) => ({ ...item, id: `${item.id}-new` })) };
      await render('/?today=2026-11-19', recomputed);

      expect(title()).toBe('후쿠오카, 2024.');
    });
  });

  describe('?today=', () => {
    test('없거나 형식이 틀리면 이 PC의 오늘을 써요', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 21, 9, 0));

      await render('/?today=2026-13-01');

      // 2026-11-21: 1년 전 오사카(11.17~19)는 2일, 2년 전 후쿠오카(11.20~22)는 0일 차이예요.
      expect(title()).toBe('오사카, 2025.');
      expect(button('더 오래된 해 보기')).not.toBeNull();
    });

    test('고를 지점이 없으면 아무것도 그리지 않고 글도 받지 않아요', async () => {
      await render('/?today=2026-06-01');

      expect(container.innerHTML).toBe('');
      expect(getPosts).not.toHaveBeenCalled();
    });
  });

  test('데모 데이터(seojin): 2026-11-19에는 2년 전 교토예요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'loading', error: null });

    await render('/?today=2026-11-19', seojin);

    expect(title()).toBe('교토, 2024.');
    expect(textOf('section p').slice(0, 3)).toEqual([
      'TWO YEARS AGO',
      'D-3 · 2주년',
      '2년 전 이맘때, 교토에 있었어요.',
    ]);
    // 사진 목록을 아직 못 받았으면 작은 사진 줄이 없어요
    expect(container.querySelector('section ul')).toBeNull();
  });
});
