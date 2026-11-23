import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import heavy from '@/data/fixtures/heavy.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useJourney } from '@/hooks/useJourney';
import PassportPage from '@/pages/PassportPage/PassportPage';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));

let container;
let root;
let location;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 주소는 effect에서 테스트로 내보내요.
function LocationProbe() {
  const current = useLocation();
  useEffect(() => {
    location = `${current.pathname}${current.search}`;
  });
  return null;
}

async function render(journeyResult) {
  vi.mocked(useJourney).mockReturnValue(journeyResult);
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/passport']}>
        <LocationProbe />
        <Routes>
          <Route path="passport" element={<PassportPage />} />
          <Route path="map" element={<p>지도</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

const ready = (journey) => ({ journey, status: 'ready', error: null });
const text = () => container.textContent;
const stats = () =>
  [...container.querySelectorAll('section[aria-label="여행 통계"] dl > div')].map((cell) =>
    [...cell.children].map((child) => child.textContent),
  );
const stampLinks = () => [...container.querySelectorAll('section[aria-labelledby] ol a')];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.resetAllMocks();
});

describe('PassportPage', () => {
  test('머리말에 기간 · 스탬프 수 · 요약 문장을 보여 줘요', async () => {
    await render(ready(seojin));

    expect(container.querySelector('h1').textContent).toBe('PASSPORT');
    expect(text()).toContain('2024 — 2026');
    expect(container.querySelector('header p.text-display-md').textContent).toBe('EIGHT-STAMPS');
    expect(text()).toContain('2년 동안 9개 나라, 19개 도시. 여권에 찍힌 순서대로 모았어요.');
  });

  test('통계 6칸을 이름 · 숫자 · 설명 순서로 그려요', async () => {
    await render(ready(seojin));

    expect(stats()).toEqual([
      ['KM', '72,492', '지구 1.8바퀴'],
      ['FLIGHTS', '20', '편도 기준'],
      ['HOURS', '97', '기내에서'],
      ['DAYS AWAY', '98', '집 밖에서 잔 날'],
      ['COUNTRIES', '9', '19개 도시'],
      ['PHOTOS', '90', '위치 기록된 사진'],
    ]);
  });

  test('입국 스탬프를 처음 들어간 순서로 찍고(한국은 빼고) 나라 · 입국일 · 체류 일수를 보여 줘요', async () => {
    await render(ready(seojin));

    const links = stampLinks();
    expect(links).toHaveLength(8);
    expect(links.map((link) => link.textContent)).not.toContainEqual(
      expect.stringContaining('한국'),
    );
    expect(links[0].getAttribute('aria-label')).toBe(
      '태국 입국 2024.07.11, 체류 3일. 이 여행을 지도에서 보기',
    );
    // 피그마처럼 둥근 스탬프와 네모 스탬프가 번갈아 놓여요. 네모에만 체류 일수가 적혀요.
    expect(links[0].querySelector('svg')).not.toBeNull();
    expect(links[1].querySelector('svg')).toBeNull();
    expect(links[1].textContent).toContain('체류 3일');
    expect(links[3].textContent).toContain('캐나다');
    expect(links[3].textContent).toContain('2025.06.28');
  });

  test('스탬프를 누르면 그 나라에 처음 들어간 여행을 01 지도에서 열어요', async () => {
    await render(ready(seojin));

    const canada = stampLinks().find((link) => link.textContent.includes('CA'));
    await act(async () => canada.click());

    expect(location).toBe('/map?trip=p_3c1060');
  });

  test('스탬프가 10개를 넘으면 다음 쪽에 이어 찍어요', async () => {
    await render(ready(heavy));

    const pages = [...container.querySelectorAll('section[aria-labelledby] ol')];
    expect(pages.map((page) => page.children.length)).toEqual([10, 4]);
    expect(text()).toContain('— 2 —');
    expect(container.querySelector('header p.text-display-md').textContent).toBe('FOURTEEN-STAMPS');
  });

  test('화면이 좁으면 여권 쪽을 통째로 줄여서 오른쪽 스탬프도 보여요', async () => {
    container.style.width = '600px';
    await render(ready(seojin));

    const page = container.querySelector('section[aria-labelledby] ol').parentElement;
    expect(page.style.transform).toBe('scale(0.5)');
    expect(page.parentElement.style.height).toBe('320px');
  });

  describe('여행 캘린더', () => {
    // 캘린더는 오늘 날짜로 기간을 정해서, 브라우저 시각을 2026-11-19 낮으로 고정해요.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 19, 12));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const calendarSection = () =>
      container.querySelector('section[aria-labelledby="passport-calendar"]');

    test('스탬프 아래에 CALENDAR 머리와 칸 색 범례를 보여 줘요', async () => {
      await render(ready(seojin));

      const section = calendarSection();
      expect(section.querySelector('#passport-calendar').textContent).toBe('여행한 날');
      expect(section.textContent).toContain('CALENDAR');
      expect([...section.querySelectorAll('ul li')].map((item) => item.textContent)).toEqual([
        '여행한 날',
        '집에 있던 날',
        '아직 안 온 날',
      ]);
      const sections = [...container.querySelectorAll('main > section')];
      expect(sections.indexOf(section)).toBeGreaterThan(
        sections.findIndex((item) => item.getAttribute('aria-labelledby') === 'passport-visas'),
      );
    });

    test('최근 24개월을 하루 한 칸으로 그리고, 화면 읽기에는 여행한 날 수를 알려요', async () => {
      await render(ready(seojin));

      const grid = calendarSection().querySelector('[role="img"]');
      expect(grid.getAttribute('aria-label')).toBe('최근 24개월 중 여행한 날 97일');
      expect(grid.children).toHaveLength(106 * 7);
      expect(calendarSection().textContent).toContain('2025');
      expect(calendarSection().textContent).toContain('2026');
    });

    test('두 여행 사이의 가장 긴 쉼을 캘린더 아래에 적어요', async () => {
      await render(ready(seojin));

      expect(calendarSection().textContent).toContain('가장 긴 쉼 · 134일');
    });

    test('화면이 좁으면 캘린더를 통째로 줄여서 오른쪽 끝도 보여요', async () => {
      container.style.width = '602px';
      await render(ready(seojin));

      // 106주 캘린더는 왼쪽 요일 칸까지 1204px이라 602px에서는 절반으로 줄어요.
      const grid = calendarSection().querySelector('[role="img"]').parentElement;
      expect(grid.style.transform).toBe('scale(0.5)');
      expect(grid.parentElement.style.height).toBe('74.5px');
    });
  });

  test('맨 아래 기록에 가장 오래 머문 곳 · 가장 먼 곳 · 가장 많이 간 나라를 사진과 함께 보여 줘요', async () => {
    await render(ready(seojin));

    const section = container.querySelector('section[aria-labelledby="passport-records"]');
    expect(section.querySelector('h2').textContent).toBe('기록');
    expect(section.textContent).toContain('RECORDS');
    expect(container.querySelector('main').lastElementChild).toBe(section);

    const cards = [...section.querySelectorAll('li')].map((card) =>
      [...card.querySelectorAll('p')].map((line) => line.textContent),
    );
    expect(cards).toEqual([
      ['LONGEST STAY', '밴쿠버 · 57일', '캐나다에서 57일, 사진 6장을 남겼어요.'],
      [
        'FARTHEST',
        '바르셀로나 · 9,599km',
        '서울에서 가장 멀리 간 곳이에요. 2026.01.05에 도착했어요.',
      ],
      ['MOST VISITED', '일본 · 5회', '후쿠오카 · 교토 · 도쿄 · 삿포로 · 오사카'],
    ]);
    // 피그마의 예시 사진 대신 그 지점의 대표 사진이에요.
    expect([...section.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual([
      '/photos/full/vancouver-6.webp',
      '/photos/full/barcelona-1.webp',
      '/photos/full/kyoto-11.webp',
    ]);
  });

  test('집을 모르면 가장 먼 곳 카드만 빼요', async () => {
    await render(ready({ ...seojin, home: null }));

    const labels = [
      ...container.querySelectorAll(
        'section[aria-labelledby="passport-records"] li p:first-of-type',
      ),
    ].map((label) => label.textContent);
    expect(labels).toEqual(['LONGEST STAY', 'MOST VISITED']);
  });

  test('여행이 0개면 머리 없이 사진 올리기 안내만 보여요', async () => {
    await render(ready(empty));

    expect(text()).toContain('아직 여행이 없어요');
    expect(container.querySelector('a[href="/upload"]')).not.toBeNull();
    expect(container.querySelector('section[aria-label="여행 통계"]')).toBeNull();
  });

  test.each([
    [{ journey: null, status: 'loading', error: null }, 'status', '불러오는 중'],
    [
      { journey: null, status: 'error', error: { status: 500, code: 'LOAD_FAILED', message: '' } },
      'alert',
      '불러오지 못했어요',
    ],
  ])('읽는 중이거나 실패하면 그 상태를 알려요(%#)', async (result, role, message) => {
    await render(result);

    expect(container.querySelector(`[role="${role}"]`).textContent).toContain(message);
  });
});
