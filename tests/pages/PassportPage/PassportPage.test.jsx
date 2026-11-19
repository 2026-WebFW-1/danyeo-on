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
      ['FLIGHTS', '18', '편도 기준'],
      ['HOURS', '94', '기내에서'],
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
