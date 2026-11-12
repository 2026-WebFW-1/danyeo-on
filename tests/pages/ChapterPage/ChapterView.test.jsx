import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import ChapterView from '@/pages/ChapterPage/ChapterView';
import { savePost } from '@/services/postService';
import { usePostStore } from '@/stores/postStore';
import { selectChapterCollage } from '@/utils/chapterCollage';
import { findChapterBySlug, getNextStop, selectChapters } from '@/utils/chapters';
import { formatPostDate } from '@/utils/postForm';
import { selectStopPhotoDetails, selectStopPhotos } from '@/utils/selectStopPhotos';
import { selectPostsOfStop } from '@/utils/tripStops';

// 글을 고치는 화면의 편집기(PostEditor)가 스토어로 저장해요. 서버로는 보내지 않아요.
vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

const stop = findChapterBySlug(seojin, '밴쿠버-2025');
const chapter = selectChapters(seojin).find((item) => item.stop.id === stop.id);
const posts = selectPostsOfStop(seojin, seojinSeed.posts, stop.id);
const photos = selectStopPhotos(stop, seojinSeed.photos);
const nextStop = getNextStop(seojin, stop.id);

// 무작위로 고르는 기준이에요. 값을 고정해서 같은 모양으로 확인해요.
const SEED = 1234;

let container;
let root;

const render = (props) =>
  act(async () =>
    root.render(
      <MemoryRouter>
        <ChapterView
          stop={stop}
          chapter={chapter}
          posts={posts}
          photos={photos}
          notes={{}}
          nextStop={nextStop}
          seed={SEED}
          {...props}
        />
      </MemoryRouter>,
    ),
  );

const titles = () => [...container.querySelectorAll('article h2')].map((h2) => h2.textContent);
const memoTexts = () => [...container.querySelectorAll('p.line-clamp-4')].map((p) => p.textContent);
const photoButtons = () => [...container.querySelectorAll('button[aria-label="사진 크게 보기"]')];
const dialog = () => container.querySelector('[role="dialog"]');
// 글 카드에는 사진 버튼 말고도 [글 고치기] 버튼이 있어서, 사진 버튼으로 좁혀서 찾아요.
const heroPhotoButton = () =>
  container.querySelector('article button[aria-label="사진 크게 보기"]');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('ChapterView 머리', () => {
  test('챕터 이름과 일수, 기간 · 나라 · 사진 수, 챕터 순번을 보여 줘요', async () => {
    await render();

    expect(container.querySelector('h1').textContent).toBe('밴쿠버에서 보낸 57일');
    expect(container.querySelector('header').textContent).toContain('CHAPTER 01  ·  LONG STAY');
    expect(container.querySelector('header').textContent).toContain(
      '2025.06.28 – 2025.08.23  ·  캐나다 CA  ·  사진 6장',
    );
    expect(container.querySelector('header').textContent).toContain('01 / 01');
  });
});

describe('ChapterView 콜라주', () => {
  test('글이 많아도 hero 하나와 글 카드 둘만 그려요(칸이 정해져 있어요)', async () => {
    await render();

    expect(posts).toHaveLength(7);
    expect(titles()).toHaveLength(3);
    expect(titles().every((title) => posts.some((post) => post.title === title))).toBe(true);
  });

  test('글 카드의 날짜는 그 글의 date 그대로예요', async () => {
    await render();

    [...container.querySelectorAll('article')].forEach((article) => {
      const title = article.querySelector('h2').textContent;
      const date = article.querySelector('p').textContent;

      expect(date).toBe(posts.find((post) => post.title === title).date);
    });
  });

  test('스티커는 글의 태그이고 같은 태그는 한 번만 그려요', async () => {
    await render();

    const stickers = [...container.querySelectorAll('span')].map((span) => span.textContent);
    expect(stickers.filter((text) => text === '밴쿠버')).toHaveLength(1);
    expect(stickers).toEqual(expect.arrayContaining(['개스타운', '산책']));
  });

  test('사진별 글이 없으면 메모 카드가 없어요(데모 글은 모두 제목이 있어요)', async () => {
    await render();

    expect(memoTexts()).toEqual([]);
  });

  test('사진별 글은 메모 카드가 되고, 둘까지만 그려요', async () => {
    const notes = Object.fromEntries(photos.map((photo) => [photo.id, `사진 ${photo.id}의 글`]));

    await render({ notes });

    const texts = memoTexts();
    expect(texts).toHaveLength(2);
    expect(texts.every((text) => text.startsWith('사진 '))).toBe(true);
  });

  test('제목 없는 짧은 글도 메모 카드가 돼요', async () => {
    const shortPost = {
      ...posts[1],
      id: 'post_short',
      date: '2025-07-01',
      title: '',
      body: '제목 없이 적은 짧은 글',
    };

    await render({ posts: [...posts, shortPost] });

    expect(memoTexts()).toEqual(['제목 없이 적은 짧은 글']);
    expect(titles()).not.toContain('');
  });

  test('글이 없어도 사진은 그려요(hero 카드와 글 카드가 없어요)', async () => {
    await render({ posts: [] });

    expect(container.querySelectorAll('article')).toHaveLength(0);
    expect(photoButtons().length).toBeGreaterThan(0);
  });

  test('seed가 같으면 같은 모양이고, 다르면 달라져요', async () => {
    await render({ seed: 1 });
    const first = titles();
    await render({ seed: 1 });
    expect(titles()).toEqual(first);

    const seen = new Set([first.join()]);
    for (let seed = 2; seed <= 10; seed += 1) {
      await render({ seed });
      seen.add(titles().join());
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('ChapterView 사진 크게 보기', () => {
  test('hero 사진을 누르면 그 사진부터 크게 보고, 지점의 사진 전부를 넘겨 볼 수 있어요', async () => {
    await render();
    const { hero } = selectChapterCollage({ stop, posts, photos, notes: {}, seed: SEED });
    const heroIndex = photos.findIndex((photo) => photo.id === hero.photo.id);

    await act(async () => heroPhotoButton().click());

    expect(dialog()).not.toBeNull();
    // 앞에 사진이 있으면 [이전 사진], 뒤에 사진이 있으면 [다음 사진]이 있어요
    expect(Boolean(dialog().querySelector('button[aria-label="이전 사진"]'))).toBe(heroIndex > 0);
    let forward = 0;
    while (dialog().querySelector('button[aria-label="다음 사진"]')) {
      await act(async () => dialog().querySelector('button[aria-label="다음 사진"]').click());
      forward += 1;
    }
    expect(forward).toBe(photos.length - 1 - heroIndex);
  });

  test('닫으면 Lightbox가 사라져요', async () => {
    await render();

    await act(async () => photoButtons()[0].click());
    await act(async () => dialog().querySelector('button[aria-label="닫기"]').click());

    expect(dialog()).toBeNull();
  });

  test('글에 사진이 안 붙고 지점 사진도 없으면 hero는 열 사진 없이 회색이에요', async () => {
    await render({ photos: [] });

    expect(heroPhotoButton()).toBeNull();
    expect(dialog()).toBeNull();
  });
});

describe('ChapterView 아래 줄', () => {
  test('다음 지점이 있으면 NEXT 글자와 [계속 여행하기]를 보여 줘요', async () => {
    await render();

    const link = container.querySelector('a');
    expect(link.textContent).toContain('계속 여행하기');
    expect(container.textContent).toContain(`NEXT  ·  ${nextStop.city}`);
  });

  test('다음 지점이 없으면 [전체 기록 보기]만 보여 줘요', async () => {
    await render({ nextStop: null });

    expect(container.querySelector('a').textContent).toContain('전체 기록 보기');
    expect(container.textContent).not.toContain('NEXT');
  });
});

describe('ChapterView 글 고치기', () => {
  const stopPhotos = selectStopPhotoDetails(stop, seojinSeed.photos);
  const { hero, cards } = selectChapterCollage({ stop, posts, photos, notes: {}, seed: SEED });
  const shown = [hero.post, ...cards];
  // 07.12 글은 사진이 붙어 있고(IMG_0188), 06.30 글은 붙은 사진도 그날 찍은 사진도 없어요.
  const post0712 = posts.find((post) => post.date === '2025-07-12');
  const post0630 = posts.find((post) => post.date === '2025-06-30');

  const editLabel = (post) => `${formatPostDate(post.date)} 글 고치기`;
  const editButtons = () => [...container.querySelectorAll('button[aria-label$=" 글 고치기"]')];
  const editButtonOf = (post) =>
    editButtons().find((button) => button.getAttribute('aria-label') === editLabel(post));
  const editor = () => container.querySelector('section[aria-label="글 고치기"]');
  const findButton = (text) =>
    [...container.querySelectorAll('button')].find((button) => button.textContent === text);

  /** 사람이 입력한 것처럼 값을 바꿔요. React가 알아채도록 원래 setter로 넣어요. */
  const type = async (element, value) => {
    const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    await act(async () => {
      set.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  // 편집기는 스토어의 글을 보여 줘서, 화면에 준 글과 같은 글을 스토어에도 넣어 둬요.
  const fillStore = (list) =>
    usePostStore.setState({
      status: 'ready',
      byDate: Object.fromEntries(list.map((post) => [post.date, post])),
    });
  const open = async (post, props) => {
    await render({ posts: [post], stopPhotos, ...props });
    await act(async () => editButtonOf(post).click());
  };

  beforeEach(() => {
    usePostStore.getState().reset();
    fillStore(posts);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    usePostStore.getState().reset();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  describe('열기', () => {
    test('hero와 글 카드마다 [글 고치기] 버튼이 하나씩 있어요', async () => {
      await render({ stopPhotos });

      expect(
        editButtons()
          .map((button) => button.getAttribute('aria-label'))
          .toSorted(),
      ).toEqual(shown.map(editLabel).toSorted());
    });

    test('hero 카드를 누르면 콜라주 대신 그 글의 편집기가 열려요', async () => {
      await render({ stopPhotos });
      expect(container.querySelectorAll('article')).toHaveLength(3);

      await act(async () => editButtonOf(hero.post).click());

      expect(editor()).not.toBeNull();
      expect(container.querySelector('input[name="title"]').value).toBe(hero.post.title);
      expect(container.querySelector('textarea[name="body"]').value).toBe(hero.post.body);
      expect(container.querySelectorAll('article')).toHaveLength(0);
    });

    test('글 카드를 누르면 그 글의 편집기가 열려요', async () => {
      await render({ stopPhotos });

      await act(async () => editButtonOf(cards[0]).click());

      expect(container.querySelector('input[name="title"]').value).toBe(cards[0].title);
      expect(editor().textContent).toContain(formatPostDate(cards[0].date));
    });

    test('제목 없는 짧은 글의 메모 카드도 눌러서 고칠 수 있어요', async () => {
      const shortPost = {
        ...posts[1],
        id: 'post_short',
        date: '2025-07-01',
        title: '',
        body: '제목 없이 적은 짧은 글',
      };
      fillStore([...posts, shortPost]);
      await render({ posts: [...posts, shortPost], stopPhotos });

      await act(async () => editButtonOf(shortPost).click());

      expect(container.querySelector('textarea[name="body"]').value).toBe('제목 없이 적은 짧은 글');
      expect(editor().textContent).toContain(formatPostDate('2025-07-01'));
    });

    test('사진별 글 메모 카드는 날짜가 없어서 눌러도 열리는 곳이 없어요', async () => {
      const notes = Object.fromEntries(photos.map((photo) => [photo.id, `사진 ${photo.id}의 글`]));

      await render({ notes, stopPhotos });

      expect(memoTexts()).toHaveLength(2);
      expect(editButtons()).toHaveLength(shown.length);
    });

    test('버튼 이름에 날짜가 있어서, 스크린 리더가 어느 글인지 알려 줘요', async () => {
      await render({ posts: [post0712], stopPhotos });

      expect(editButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
        '2025.07.12 (토) 글 고치기',
      ]);
    });

    test('열 때 맨 위로 올려서, 콜라주를 보던 자리와 상관없이 편집기가 보여요', async () => {
      await open(post0712);

      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    });

    test('열리면 편집 화면으로 포커스가 옮겨져요(눌렀던 카드 버튼이 사라지기 때문이에요)', async () => {
      await open(post0712);

      expect(document.activeElement).toBe(editor());
    });
  });

  describe('편집 화면', () => {
    test('머리는 그대로 두고, 콜라주와 [계속 여행하기]는 가려요', async () => {
      await render({ posts: [post0712], stopPhotos });
      expect(container.textContent).toContain('계속 여행하기');

      await act(async () => editButtonOf(post0712).click());

      expect(container.querySelector('h1').textContent).toBe('밴쿠버에서 보낸 57일');
      expect(container.textContent).not.toContain('계속 여행하기');
      expect(container.querySelector('a')).toBeNull();
    });

    test('날짜 옆에 Day N을 보여요(지점의 첫날 06.28이 Day 1이라 07.12는 Day 15예요)', async () => {
      await open(post0712);

      expect(editor().textContent).toContain('2025.07.12 (토) · Day 15');
    });

    test('왼쪽에는 글에 붙은 사진과 파일 이름 · 촬영 시각 · 도시를 보여 줘요', async () => {
      await open(post0712);

      expect(editor().querySelector('button[aria-label="사진 크게 보기"]')).not.toBeNull();
      expect(editor().querySelector('figcaption').textContent).toBe(
        'IMG_0188.JPG · 2025.07.12 13:10 · 밴쿠버',
      );
    });

    test('붙은 사진도 그날 찍은 사진도 없으면 회색 칸이고 설명도 없어요', async () => {
      await open(post0630);

      expect(editor().querySelector('button[aria-label="사진 크게 보기"]')).toBeNull();
      expect(editor().querySelector('figcaption')).toBeNull();
      expect(container.querySelector('input[name="title"]').value).toBe(post0630.title);
    });

    test('지점 사진을 못 받았어도(stopPhotos가 없어도) 편집기는 열려요', async () => {
      await render({ posts: [post0712] });

      await act(async () => editButtonOf(post0712).click());

      expect(editor()).not.toBeNull();
      expect(editor().querySelector('figcaption')).toBeNull();
    });

    test('왼쪽 사진을 누르면 그 사진부터 크게 보고, 닫아도 편집기는 그대로예요', async () => {
      await open(post0712);

      await act(async () => editor().querySelector('button[aria-label="사진 크게 보기"]').click());
      expect(dialog()).not.toBeNull();
      const photoIndex = photos.findIndex((photo) => photo.id === 'p_b2a9a9');
      let back = 0;
      while (dialog().querySelector('button[aria-label="이전 사진"]')) {
        await act(async () => dialog().querySelector('button[aria-label="이전 사진"]').click());
        back += 1;
      }
      expect(back).toBe(photoIndex);

      await act(async () => dialog().querySelector('button[aria-label="닫기"]').click());
      expect(dialog()).toBeNull();
      expect(editor()).not.toBeNull();
    });
  });

  describe('닫기', () => {
    test('[취소]를 누르면 콜라주와 [계속 여행하기]가 돌아와요', async () => {
      await open(post0712);

      await act(async () => findButton('취소').click());

      expect(editor()).toBeNull();
      expect(container.querySelectorAll('article')).toHaveLength(1);
      expect(container.textContent).toContain('계속 여행하기');
    });

    test('돌아오면 들어올 때와 같은 모양이에요(seed를 따로 주지 않아도요)', async () => {
      await render({ seed: undefined, stopPhotos });
      const before = titles();
      expect(before).toHaveLength(3);

      await act(async () => editButtons()[0].click());
      await act(async () => findButton('취소').click());

      expect(titles()).toEqual(before);
    });

    test('저장하면 "저장됨"을 잠깐 보여 준 뒤 콜라주로 돌아와요', async () => {
      await open(post0712);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      await type(container.querySelector('input[name="title"]'), '다리 위에서');
      await act(async () => findButton('저장').click());

      expect(savePost).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2025-07-12', title: '다리 위에서' }),
      );
      expect(container.textContent).toContain('저장됨 · 방금');
      expect(editor()).not.toBeNull();

      await act(async () => vi.advanceTimersByTime(1000));

      expect(editor()).toBeNull();
      expect(container.querySelectorAll('article')).toHaveLength(1);
    });

    test('다시 열면 앞에서 쓰다 만 내용이 아니라 글 그대로 시작해요', async () => {
      // 고친 게 있으면 [취소]가 닫을지 물어볼 수 있어요(window.confirm). Vitest 브라우저 모드는 confirm을 경고만
      // 찍고 false를 돌려주는 함수로 바꿔 두어서 편집기가 안 닫혀요. 닫겠다고 답하도록 가짜로 바꿔요.
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await open(post0712);
      await type(container.querySelector('input[name="title"]'), '쓰다 만 제목');
      await act(async () => findButton('취소').click());

      await act(async () => editButtonOf(post0712).click());

      expect(container.querySelector('input[name="title"]').value).toBe(post0712.title);
    });
  });
});
