import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useJourney } from '@/hooks/useJourney';
import MapPage from '@/pages/MapPage/MapPage';
import { usePlaybackStore } from '@/stores/playbackStore';
import { selectLegsByPeriod } from '@/utils/periodLegs';
import { selectLegsByTrip } from '@/utils/tripLegs';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
// 도착 카드가 펼칠 사진을 읽어요. 이 테스트는 카드의 링크만 봐서 사진 없이 둬요.
vi.mock('@/hooks/useMyPhotos', () => ({
  useMyPhotos: () => ({ photos: [], status: 'ready', error: null }),
}));

const OSAKA = seojin.trips.find((trip) => trip.name === '오사카');
const READY = { journey: seojin, status: 'ready', error: null };

let container;
let root;

function LocationProbe() {
  const { pathname, search } = useLocation();
  return (
    <>
      <output data-testid="pathname">{pathname}</output>
      <output data-testid="search">{search}</output>
    </>
  );
}

// 02 · 03 자리예요. 브라우저의 뒤로 가기 대신 누를 버튼만 있어요.
function OtherPage() {
  const navigate = useNavigate();
  return (
    <button type="button" data-testid="back" onClick={() => navigate(-1)}>
      뒤로
    </button>
  );
}

function renderApp(entry) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<OtherPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openMap(entry) {
  await act(() => root.render(renderApp(entry)));
}

function getHeaderText() {
  return container.querySelector('header')?.textContent;
}

function getTab(label) {
  return [...container.querySelectorAll('[aria-label="기간"] button')].find(
    (button) => button.textContent === label,
  );
}

function getPressedTabs() {
  return [...container.querySelectorAll('[aria-label="기간"] [aria-pressed="true"]')].map(
    (button) => button.textContent,
  );
}

function getNotice() {
  return [...container.querySelectorAll('h2')].find(
    (heading) => heading.textContent === '아직 여행이 없어요',
  );
}

function getPlaybackButton() {
  return [...container.querySelectorAll('button')].find((button) =>
    /play|pause|replay/i.test(button.textContent),
  );
}

function getPathname() {
  return container.querySelector('[data-testid="pathname"]').textContent;
}

function getStopDot(city) {
  return [...container.querySelectorAll('svg [role="button"]')].find((dot) =>
    dot.getAttribute('aria-label').startsWith(`${city},`),
  );
}

function getCardLink() {
  return container.querySelector('[aria-label="도착한 지점"] a');
}

function getSearch() {
  return container.querySelector('[data-testid="search"]').textContent;
}

function getLoadedLegIds() {
  return usePlaybackStore.getState().legs.map((leg) => leg.id);
}

function toIds(legs) {
  return legs.map((leg) => leg.id);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // 재생이 프레임마다 흐르지 않게 움직임 줄이기로 열어요. 다 그린 상태로 시작해요.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
  vi.mocked(useJourney).mockReturnValue(READY);
  // 스토어는 테스트 사이에 남아요. 앞 테스트의 자리에서 이어 재생하지 않게 비워요(usePlayback의 canResume).
  usePlaybackStore.getState().load([]);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('MapPage ?trip=', () => {
  test('있는 ID면 그 여행만 재생하고 머리말에 여행 이름과 날짜를 보여 줘요', async () => {
    await openMap(`/map?trip=${OSAKA.id}`);

    expect(getLoadedLegIds()).toEqual(OSAKA.legIds);
    expect(getHeaderText()).toBe('My Journey오사카2025.09.19 – 2025.09.21');
    expect(getPressedTabs()).toEqual([]);
  });

  test('없는 ID면 무시하고 기본 기간을 재생해요', async () => {
    await openMap('/map?trip=p_none');

    expect(getLoadedLegIds()).toEqual(toIds(selectLegsByPeriod(seojin, '2y')));
    expect(getHeaderText()).not.toContain('오사카');
    expect(getPressedTabs()).toEqual(['2y']);
  });

  test('?period=와 같이 오면 ?trip=이 먼저예요', async () => {
    await openMap(`/map?period=all&trip=${OSAKA.id}`);

    expect(getLoadedLegIds()).toEqual(OSAKA.legIds);
    expect(getPressedTabs()).toEqual([]);
  });

  test('없는 ID가 ?period=와 같이 오면 그 기간을 재생해요', async () => {
    await openMap('/map?period=1y&trip=p_none');

    expect(getLoadedLegIds()).toEqual(toIds(selectLegsByPeriod(seojin, '1y')));
    expect(getPressedTabs()).toEqual(['1y']);
  });

  test.each([['1y'], ['2y'], ['all']])(
    '여행을 보다가 %s 탭을 누르면 ?trip=을 지우고 그 기간을 재생해요',
    async (period) => {
      await openMap(`/map?trip=${OSAKA.id}`);

      await act(() => getTab(period).click());

      expect(getSearch()).toBe(`?period=${period}`);
      expect(getLoadedLegIds()).toEqual(toIds(selectLegsByPeriod(seojin, period)));
      expect(getPressedTabs()).toEqual([period]);
      expect(getHeaderText()).not.toContain('오사카');
    },
  );

  test('gap으로 도착한 여행은 gap부터 재생해요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: edge, status: 'ready', error: null });
    const chiangMai = edge.trips.find((trip) => trip.name === '치앙마이');

    await openMap(`/map?trip=${chiangMai.id}`);

    expect(getLoadedLegIds()).toEqual(toIds(selectLegsByTrip(edge, chiangMai.id)));
    expect(usePlaybackStore.getState().legs[0].kind).toBe('gap');
  });

  test('로딩이 끝나면 그 여행을 재생해요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: null, status: 'loading', error: null });
    await openMap(`/map?trip=${OSAKA.id}`);

    expect(getLoadedLegIds()).toEqual([]);
    expect(getHeaderText()).toBeUndefined();

    vi.mocked(useJourney).mockReturnValue(READY);
    await act(() => root.render(renderApp(`/map?trip=${OSAKA.id}`)));

    expect(getLoadedLegIds()).toEqual(OSAKA.legIds);
    expect(getHeaderText()).toContain('오사카');
  });

  test('다시 그려도 재생을 처음으로 되돌리지 않아요', async () => {
    await openMap(`/map?trip=${OSAKA.id}`);
    const loadedLegs = usePlaybackStore.getState().legs;

    await act(() => root.render(renderApp(`/map?trip=${OSAKA.id}`)));

    expect(usePlaybackStore.getState().legs).toBe(loadedLegs);
  });
});

describe('MapPage 지점에서 02 · 03으로 가기 (#206)', () => {
  const BANFF = seojin.stops.find((stop) => stop.city === '밴프');

  test('챕터 지점을 누르면 도착 카드가 뜨고, 카드를 누르면 02 챕터로 가요', async () => {
    await openMap('/map?period=all');
    expect(getCardLink()).toBeNull();

    await act(() => getStopDot('밴쿠버').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(getCardLink().getAttribute('aria-label')).toBe('밴쿠버 챕터 열기');

    await act(() => getCardLink().click());

    expect(getPathname()).toBe('/chapter/밴쿠버-2025');
  });

  test('챕터가 아닌 지점은 03에서 그 여행의 탭으로 가요', async () => {
    await openMap('/map?period=all');

    await act(() => getStopDot('밴프').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await act(() => getCardLink().click());

    expect(getPathname()).toBe('/places');
    expect(getSearch()).toBe(`?trip=${BANFF.tripId}`);
  });

  test('키보드로 지점을 고르고 카드의 링크로 갈 수 있어요', async () => {
    await openMap('/map?period=all');

    await act(() =>
      getStopDot('밴쿠버').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      ),
    );

    // 링크(a)라 Tab으로 닿고 Enter로 가요. Enter는 브라우저가 click으로 바꿔 줘요.
    expect(getCardLink().tabIndex).toBe(0);
    await act(() => getCardLink().click());

    expect(getPathname()).toBe('/chapter/밴쿠버-2025');
  });

  test('경유 지점은 지도에 점이 없고 도착하는 구간도 없어서, 갈 카드가 뜨지 않아요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: edge, status: 'ready', error: null });
    const transit = edge.stops.find((stop) => stop.transit);
    await openMap('/map?period=all');

    expect(getStopDot(transit.city)).toBeUndefined();
    expect(usePlaybackStore.getState().legs.some((leg) => leg.to === transit.id)).toBe(false);
  });

  test('뒤로 가기로 돌아오면 같은 기간을 보던 자리에서 이어요', async () => {
    await openMap('/map?period=all');
    await act(() => getStopDot('밴쿠버').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const { elapsedMs } = usePlaybackStore.getState();
    expect(elapsedMs).toBeLessThan(Infinity);

    await act(() => getCardLink().click());
    await act(() => container.querySelector('[data-testid="back"]').click());

    expect(getPathname()).toBe('/map');
    expect(getSearch()).toBe('?period=all');
    expect(usePlaybackStore.getState().elapsedMs).toBe(elapsedMs);
    expect(getCardLink().getAttribute('aria-label')).toBe('밴쿠버 챕터 열기');
  });
});

describe('MapPage 구간 라벨 (#256)', () => {
  // seojin 2Y: 밴쿠버 → 밴프(차 552km) 여행이 먼저, 졸업 여행의 파리 → 런던(기차 343km)이 뒤예요.
  const legs = selectLegsByPeriod(seojin, '2y');
  const londonIndex = legs.findIndex((leg) => Math.round(leg.km) === 343 && leg.mode === 'train');

  function hasLabel(text) {
    return [...container.querySelectorAll('foreignObject p')].some((label) =>
      label.textContent.includes(text),
    );
  }

  test('다 그린 상태에서는 모든 여행의 라벨이 보여요', async () => {
    await openMap('/map?period=2y');

    expect(hasLabel('차 · 552km')).toBe(true);
    expect(hasLabel('기차 · 343km')).toBe(true);
  });

  test('기간 재생 중에는 지금 여행의 라벨만 보이고 지난 여행의 라벨은 남지 않아요', async () => {
    await openMap('/map?period=2y');

    await act(async () => usePlaybackStore.getState().seek({ legIndex: londonIndex, t: 1 }));

    expect(hasLabel('기차 · 343km')).toBe(true);
    expect(hasLabel('차 · 552km')).toBe(false);
  });
});

describe('MapPage 여행 0개(15a)', () => {
  beforeEach(() => {
    vi.mocked(useJourney).mockReturnValue({ journey: empty, status: 'ready', error: null });
  });

  test('안내와 [사진 올리기]를 보여 주고 재생 부품은 그리지 않아요', async () => {
    await openMap('/map');

    expect(getNotice()).toBeDefined();
    const upload = [...container.querySelectorAll('a')].find(
      (link) => link.textContent === '사진 올리기',
    );
    expect(upload.getAttribute('href')).toBe('/upload');
    expect(getHeaderText()).toBeUndefined();
    expect(getPlaybackButton()).toBeUndefined();
    for (const label of ['이동 수단', '여행 타임라인', '도착한 지점', '지도 확대']) {
      expect(container.querySelector(`[aria-label="${label}"]`)).toBeNull();
    }
  });

  test('기간 탭은 흐리게 두고 누를 수 없어요', async () => {
    await openMap('/map');

    const tabs = [...container.querySelectorAll('[aria-label="기간"] button')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['1y', '2y', 'all']);
    expect(tabs.every((tab) => tab.disabled)).toBe(true);
    expect(getPressedTabs()).toEqual([]);

    await act(() => getTab('all').click());

    expect(getSearch()).toBe('');
  });

  test('?trip=·?period=가 붙어 와도 같은 안내를 보여 줘요', async () => {
    await openMap('/map?period=1y&trip=p_none');

    expect(getNotice()).toBeDefined();
    expect(getPressedTabs()).toEqual([]);
    expect(getLoadedLegIds()).toEqual([]);
  });

  test('불러오는 동안에는 안내도 기간 탭도 없어요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: null, status: 'loading', error: null });
    await openMap('/map');

    expect(getNotice()).toBeUndefined();
    expect(container.querySelector('[aria-label="기간"]')).toBeNull();
  });

  test('여행이 있으면 안내 없이 지금처럼 재생해요', async () => {
    vi.mocked(useJourney).mockReturnValue(READY);
    await openMap('/map');

    expect(getNotice()).toBeUndefined();
    expect(getHeaderText()).toContain('My Journey');
    expect(getTab('2y').disabled).toBe(false);
    expect(getPressedTabs()).toEqual(['2y']);
  });
});

describe('MapPage 지도 확대 (#184)', () => {
  function getZoomButton(label) {
    return container.querySelector(`[aria-label="지도 확대"] [aria-label="${label}"]`);
  }

  function getMapTransform() {
    return container
      .querySelector('svg[aria-label="여행 경로 지도"] > g')
      .getAttribute('transform');
  }

  test('처음에는 세계 지도 전체라 축소 · 전체 보기를 막아요', async () => {
    await openMap('/map');

    expect(getMapTransform()).toBe('translate(0 0) scale(1)');
    expect(getZoomButton('지도 확대').disabled).toBe(false);
    expect(getZoomButton('지도 축소').disabled).toBe(true);
    expect(getZoomButton('세계 지도 전체 보기').disabled).toBe(true);
  });

  test('확대 버튼으로 키우고, 전체 보기로 처음 자리로 돌아와요', async () => {
    await openMap('/map');

    await act(() => getZoomButton('지도 확대').click());

    expect(getMapTransform()).toContain('scale(1.5)');
    expect(getZoomButton('지도 축소').disabled).toBe(false);

    await act(() => getZoomButton('세계 지도 전체 보기').click());

    expect(getMapTransform()).toBe('translate(0 0) scale(1)');
  });

  test('확대해도 지점 점은 화면 크기 그대로예요', async () => {
    await openMap('/map');
    const stop = container.querySelector('svg g[role="button"]');
    const before = stop.getBoundingClientRect().width;

    await act(() => getZoomButton('지도 확대').click());
    await act(() => getZoomButton('지도 확대').click());

    expect(stop.getBoundingClientRect().width).toBeCloseTo(before, 0);
  });
});
