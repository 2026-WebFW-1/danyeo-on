import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { ARRIVAL_FAN_CLOSE_DELAY_MS } from '@/constants/arrivalFan';
import ArrivalCards from '@/pages/MapPage/ArrivalCards';
import { usePlaybackStore } from '@/stores/playbackStore';
import { buildTimeline } from '@/utils/playback';

vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));

const stopsById = new Map(seojin.stops.map((stop) => [stop.id, stop]));
// 경유가 아닌 지점이 여럿인 여행이에요(예: 방콕 · 다낭). 지점마다 골고루 펼치는지 보려고요.
const TRIP = seojin.trips.find(
  (trip) => trip.stopIds.filter((id) => !stopsById.get(id).transit).length > 1,
);
const FRONT_STOP = stopsById.get(TRIP.stopIds[0]);
const PHOTOS = seojin.stops.flatMap((stop) =>
  stop.photoIds.map((id) => ({ id, fileKey: `public:/photos/${id}.webp` })),
);

let container;
let root;

async function render(trip = TRIP) {
  await act(() =>
    root.render(<ArrivalCards arrivalStops={[FRONT_STOP]} stops={seojin.stops} trip={trip} />),
  );
}

function getSection() {
  return container.querySelector('section[aria-label="도착한 지점"]');
}

function getFan() {
  return container.querySelector('ul');
}

// React의 onMouseEnter · onMouseLeave는 mouseover · mouseout으로 받아요.
async function hover() {
  const card = container.querySelector('article');
  await act(() =>
    card.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }),
    ),
  );
}

// 사진 사이 빈틈을 지날 때 접히지 않게 잠깐 기다렸다 접어서, 그 시간만큼 기다려요.
async function unhover({ wait = true } = {}) {
  const card = container.querySelector('article');
  await act(async () => {
    card.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    if (wait) await new Promise((resolve) => setTimeout(resolve, ARRIVAL_FAN_CLOSE_DELAY_MS + 50));
  });
}

function getPhotoTransforms() {
  return [...getFan().querySelectorAll('li')].map((li) => [
    li.querySelector('p').textContent,
    li.style.transform,
  ]);
}

function setPlaying(isPlaying) {
  usePlaybackStore.setState({
    legs: seojin.legs,
    timeline: buildTimeline(seojin.legs),
    elapsedMs: 0,
    isPlaying,
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(useMyPhotos).mockReturnValue({ photos: PHOTOS, status: 'ready', error: null });
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

describe('ArrivalCards 사진 펼치기 (#187)', () => {
  test('마우스를 올리면 여행 전체의 사진을 펼치고 여행 이름과 사진 수를 보여 줘요', async () => {
    setPlaying(false);
    await render();

    expect(getFan().getAttribute('aria-label')).toBe(`${TRIP.name} 사진`);
    expect(getFan().getAttribute('aria-hidden')).toBe('true');

    await hover();

    expect(getFan().getAttribute('aria-hidden')).toBe('false');
    const photoCount = TRIP.stopIds
      .map((id) => stopsById.get(id))
      .filter((stop) => !stop.transit)
      .reduce((sum, stop) => sum + stop.photoCount, 0);
    expect(getSection().textContent).toContain(`${TRIP.name} · 사진 ${photoCount}장`);
    // 여행의 지점마다 고르게 골라서, 펼친 사진에 여러 도시가 있어요
    const cities = [...getFan().querySelectorAll('li p')].map((p) => p.textContent);
    expect(new Set(cities).size).toBeGreaterThan(1);

    await unhover();

    expect(getFan().getAttribute('aria-hidden')).toBe('true');
  });

  test('처음 펼치기 전에는 이미지를 받지 않아요', async () => {
    setPlaying(false);
    await render();

    expect(getFan().querySelectorAll('img')).toHaveLength(0);

    await hover();

    expect(getFan().querySelectorAll('img').length).toBe(getFan().querySelectorAll('li').length);
  });

  test('재생 중이면 펼친 동안 멈추고, 접으면 이어서 재생해요', async () => {
    setPlaying(true);
    await render();

    await hover();
    expect(usePlaybackStore.getState().isPlaying).toBe(false);

    await unhover();
    expect(usePlaybackStore.getState().isPlaying).toBe(true);
  });

  test('멈춰 있었으면 접어도 멈춘 채예요', async () => {
    setPlaying(false);
    await render();

    await hover();
    await unhover();

    expect(usePlaybackStore.getState().isPlaying).toBe(false);
  });

  test('키보드로 포커스해도 펼쳐요', async () => {
    setPlaying(false);
    await render();

    await act(() => getSection().focus());
    expect(getFan().getAttribute('aria-hidden')).toBe('false');

    await act(() => getSection().blur());
    expect(getFan().getAttribute('aria-hidden')).toBe('true');
  });

  test('펼칠 사진이 없으면 펼치지 않고, 포커스도 받지 않고, 재생도 멈추지 않아요', async () => {
    setPlaying(true);
    await render(null);

    await hover();

    expect(getFan()).toBeNull();
    expect(getSection().hasAttribute('tabindex')).toBe(false);
    expect(usePlaybackStore.getState().isPlaying).toBe(true);
  });

  test('마우스가 잠깐 나갔다 바로 들어오면 접지 않아요', async () => {
    setPlaying(false);
    await render();

    await hover();
    await unhover({ wait: false });
    await hover();
    await act(() => new Promise((resolve) => setTimeout(resolve, ARRIVAL_FAN_CLOSE_DELAY_MS + 50)));

    expect(getFan().getAttribute('aria-hidden')).toBe('false');
  });

  test('펼친 동안 사진 목록이 늦게 도착해도 보이던 사진은 그 자리에 그대로예요', async () => {
    setPlaying(false);
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'loading', error: null });
    await render();

    // 마우스는 접기를 잠깐 늦춰서(타이머) 바로 열고 닫히는 포커스로 확인해요
    await act(() => getSection().focus());
    const before = getPhotoTransforms();

    vi.mocked(useMyPhotos).mockReturnValue({ photos: PHOTOS, status: 'ready', error: null });
    await render();

    expect(getPhotoTransforms()).toEqual(before);

    // 다음에 펼칠 때는 새 목록으로 펼쳐요
    await act(() => getSection().blur());
    await act(() => getSection().focus());
    expect(getFan().querySelectorAll('li').length).toBeGreaterThan(before.length);
  });
});
