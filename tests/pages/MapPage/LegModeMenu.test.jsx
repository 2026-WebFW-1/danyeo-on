import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import MapPage from '@/pages/MapPage/MapPage';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useCorrections', () => ({ useCorrections: vi.fn() }));

// 2Y(처음 화면)에서 고칠 수 있는 라벨: 후쿠오카 → 집(기차 544km) · 밴쿠버 → 밴프(차 552km) · 졸업 여행 안 기차(343km)
const GRAD_TRIP = seojin.trips.find((trip) => trip.name === '졸업 여행');
const GRAD_TRAIN = seojin.legs.find(
  (leg) => leg.tripId === GRAD_TRIP.id && leg.kind === 'between' && leg.mode === 'train',
);
const FUKUOKA_TRIP = seojin.trips.find((trip) => trip.name === '후쿠오카');

let container;
let root;
let add;

async function openMap(entry = '/map') {
  await act(() =>
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

function getLabel(text) {
  return [...container.querySelectorAll('foreignObject p, foreignObject button')].find((label) =>
    label.textContent.includes(text),
  );
}

function getLabelButton(text) {
  return [...container.querySelectorAll('button[aria-haspopup="menu"]')].find((button) =>
    button.textContent.includes(text),
  );
}

function withLeg(legId, changes) {
  return {
    ...seojin,
    legs: seojin.legs.map((leg) => (leg.id === legId ? { ...leg, ...changes } : leg)),
  };
}

function getMenu() {
  return container.querySelector('[role="menu"]');
}

// '기차'에도 '차'가 들어 있어서 이모지까지 붙여 앞부분으로 찾아요.
function getMenuItem(label) {
  const mode = Object.keys(MODE_LABEL).find((key) => MODE_LABEL[key] === label);
  return [...container.querySelectorAll('[role="menuitemradio"]')].find((item) =>
    item.textContent.startsWith(`${MODE_EMOJI[mode]}${label}`),
  );
}

const click = (element) => act(async () => element.click());

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // 움직임 줄이기로 열어서 다 그린 상태로 시작해요. 지나온 구간의 라벨이 모두 보여요.
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
  vi.mocked(useJourney).mockReturnValue({ journey: seojin, status: 'ready', error: null });
  add = vi.fn().mockResolvedValue({});
  vi.mocked(useCorrections).mockReturnValue({ status: 'ready', add });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('01 이동 수단 바꾸기', () => {
  test('지점에서 출발하는 구간의 라벨은 눌러서 고칠 수 있어요', async () => {
    await openMap();

    expect(getLabelButton('기차 · 544km')).toBeDefined();
    expect(getLabelButton('차 · 552km')).toBeDefined();
    expect(getLabelButton('기차 · 343km')).toBeDefined();
  });

  test('집에서 나가는 구간은 고칠 수 없어서 라벨을 누를 수 없어요', async () => {
    // 후쿠오카 → 집이 비행이면 라벨 자리가 비어 집 → 후쿠오카(기차 545km) 라벨이 보여요.
    const returnLeg = seojin.legs.find(
      (leg) => leg.tripId === FUKUOKA_TRIP.id && leg.kind === 'return',
    );
    vi.mocked(useJourney).mockReturnValue({
      journey: withLeg(returnLeg.id, { mode: 'flight' }),
      status: 'ready',
      error: null,
    });
    await openMap(`/map?trip=${FUKUOKA_TRIP.id}`);

    expect(getLabel('기차 · 545km').tagName).toBe('P');
    expect(getLabelButton('기차 · 545km')).toBeUndefined();
  });

  test('라벨을 누르면 메뉴가 열리고 지금 이동 수단에 표시가 있어요', async () => {
    await openMap();

    await click(getLabelButton('기차 · 343km'));

    expect(getMenu()).not.toBeNull();
    expect(getLabelButton('기차 · 343km').getAttribute('aria-expanded')).toBe('true');
    expect(getMenuItem('기차').getAttribute('aria-checked')).toBe('true');
    expect(getMenuItem('비행').getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(getMenuItem('기차'));
  });

  test('다른 이동 수단을 고르면 출발 지점 사진으로 보정을 저장하고 메뉴를 닫아요', async () => {
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('차'));

    expect(add).toHaveBeenCalledWith({ type: 'mode', fromPhotoId: GRAD_TRAIN.from, mode: 'car' });
    expect(getMenu()).toBeNull();
  });

  test('지금 이동 수단을 고르면 저장하지 않고 닫아요', async () => {
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('기차'));

    expect(add).not.toHaveBeenCalled();
    expect(getMenu()).toBeNull();
  });

  test('저장에 실패하면 메뉴를 닫지 않고 안내를 띄워요', async () => {
    add.mockRejectedValue({ status: 0, code: 'SAVE_FAILED', message: 'x' });
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('비행'));

    expect(getMenu()).not.toBeNull();
    expect(getMenu().querySelector('[role="alert"]').textContent).toContain('저장하지 못했어요');
  });

  test('보정을 불러오는 동안에는 골라도 저장하지 않아요', async () => {
    vi.mocked(useCorrections).mockReturnValue({ status: 'loading', add });
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('차'));

    expect(getMenuItem('차').getAttribute('aria-disabled')).toBe('true');
    expect(add).not.toHaveBeenCalled();
  });

  test('Esc를 누르거나 메뉴 밖을 누르면 닫혀요', async () => {
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await act(async () => {
      getMenuItem('기차').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(getMenu()).toBeNull();

    await click(getLabelButton('기차 · 343km'));
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(getMenu()).toBeNull();
  });

  test('열린 라벨을 다시 누르면 닫히고, 다른 라벨을 누르면 그 라벨의 메뉴로 바뀌어요', async () => {
    await openMap();
    await click(getLabelButton('기차 · 343km'));

    await click(getLabelButton('차 · 552km'));
    expect(getMenuItem('차').getAttribute('aria-checked')).toBe('true');

    await click(getLabelButton('차 · 552km'));
    expect(getMenu()).toBeNull();
  });

  test('비행으로 고친 구간도 라벨이 남아서 다시 고칠 수 있어요', async () => {
    vi.mocked(useJourney).mockReturnValue({
      journey: withLeg(GRAD_TRAIN.id, { mode: 'flight', modeSource: 'user' }),
      status: 'ready',
      error: null,
    });
    await openMap();

    await click(getLabelButton('비행 · 343km'));

    expect(getMenuItem('비행').getAttribute('aria-checked')).toBe('true');
  });
});
