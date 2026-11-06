import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import ChapterView from '@/pages/ChapterPage/ChapterView';
import { findChapterBySlug, getNextStop, selectChapters } from '@/utils/chapters';
import { selectStopPhotos } from '@/utils/selectStopPhotos';
import { selectPostsOfStop } from '@/utils/tripStops';

const stop = findChapterBySlug(seojin, '밴쿠버-2025');
const chapter = selectChapters(seojin).find((item) => item.stop.id === stop.id);
const posts = selectPostsOfStop(seojin, seojinSeed.posts, stop.id);
const photos = selectStopPhotos(stop, seojinSeed.photos);
const nextStop = getNextStop(seojin, stop.id);

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
          {...props}
        />
      </MemoryRouter>,
    ),
  );

const titles = () => [...container.querySelectorAll('article h2')].map((h2) => h2.textContent);
const memoTexts = () => [...container.querySelectorAll('p.line-clamp-4')].map((p) => p.textContent);
const photoButtons = () => [...container.querySelectorAll('button[aria-label="사진 크게 보기"]')];
const dialog = () => container.querySelector('[role="dialog"]');
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
  test('글은 모두 카드가 돼요(첫 글은 hero, 나머지는 글 카드)', async () => {
    await render();

    expect(titles().toSorted()).toEqual(posts.map((post) => post.title).toSorted());
  });

  test('글 카드의 날짜는 글의 date 그대로예요', async () => {
    await render();

    expect(container.textContent).toContain('2025-06-28');
    expect(container.textContent).toContain('2025-07-05');
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

  test('콜라주에 올린 사진의 사진별 글은 메모 카드가 돼요', async () => {
    const picked = photos.map((photo) => photo.id);
    const notes = Object.fromEntries(picked.map((id) => [id, `사진 ${id}의 글`]));

    await render({ notes });

    const texts = memoTexts();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every((text) => text.startsWith('사진 '))).toBe(true);
  });

  test('제목 없는 짧은 글이 사진별 글보다 먼저 메모 카드가 돼요', async () => {
    const shortPost = {
      ...posts[1],
      id: 'post_short',
      date: '2025-07-01',
      title: '',
      body: '제목 없이 적은 짧은 글',
    };
    const notes = Object.fromEntries(photos.map((photo) => [photo.id, '사진별 글']));

    await render({ posts: [...posts, shortPost], notes });

    expect(memoTexts()[0]).toBe('제목 없이 적은 짧은 글');
    expect(titles()).not.toContain('');
  });

  test('글이 없어도 사진은 그려요(hero 카드와 글 카드가 없어요)', async () => {
    await render({ posts: [] });

    expect(container.querySelectorAll('article')).toHaveLength(0);
    expect(photoButtons().length).toBeGreaterThan(0);
  });
});

describe('ChapterView 사진 크게 보기', () => {
  test('hero 사진을 누르면 그 사진부터 크게 보고, 지점의 사진 전부를 넘겨 볼 수 있어요', async () => {
    await render();
    const heroIndex = photos.findIndex((photo) => photo.id === posts[0].photoIds[0]);

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

    expect(container.querySelector('article button')).toBeNull();
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
