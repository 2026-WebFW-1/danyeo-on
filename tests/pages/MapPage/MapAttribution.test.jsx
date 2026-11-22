import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useJourney } from '@/hooks/useJourney';
import MapPage from '@/pages/MapPage/MapPage';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));

let container;
let root;

async function openMap(journey) {
  vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready', error: null });
  await act(() =>
    root.render(
      <MemoryRouter initialEntries={['/map']}>
        <MapPage />
      </MemoryRouter>,
    ),
  );
}

function getLink(text) {
  return [...container.querySelectorAll('a')].find((link) => link.textContent === text);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // 재생이 프레임마다 흐르지 않게 움직임 줄이기로 열어요.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
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

describe('MapPage 출처 표기 (#205)', () => {
  test('OSM 표기는 저작권 안내를 새 탭으로 열고, [출처]는 출처 페이지로 가요', async () => {
    await openMap(seojin);

    const osm = getLink('© OpenStreetMap contributors');
    expect(osm.href).toBe('https://www.openstreetmap.org/copyright');
    expect(osm.target).toBe('_blank');
    expect(getLink('출처').getAttribute('href')).toBe('/credits');
  });

  test('여행이 없는 계정에도 보여요', async () => {
    await openMap(empty);

    expect(getLink('© OpenStreetMap contributors')).toBeDefined();
  });
});
