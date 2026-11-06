import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useJourney } from '@/hooks/useJourney';
import MapPage from '@/pages/MapPage/MapPage';
import { usePlaybackStore } from '@/stores/playbackStore';
import { selectLegsByPeriod } from '@/utils/periodLegs';
import { selectLegsByTrip } from '@/utils/tripLegs';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));

const OSAKA = seojin.trips.find((trip) => trip.name === '오사카');
const READY = { journey: seojin, status: 'ready', error: null };

let container;
let root;

function LocationProbe() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}

function renderApp(entry) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/map" element={<MapPage />} />
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
