import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import MapPage from '@/pages/MapPage/MapPage';
import { useCorrectionStore } from '@/stores/correctionStore';
import { usePlaybackStore } from '@/stores/playbackStore';

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
let addMany;

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

function getEditButton() {
  return container.querySelector('button[aria-label="이동 수단 고치기"]');
}

function getPanel() {
  return container.querySelector('section[aria-label="이동 수단 고치기"]');
}

// 고치기 목록에서 그 구간 줄의 이동 수단 버튼이에요.
function getPanelModeButton(route, label) {
  return getPanel().querySelector(`[aria-label="${route} 이동 수단"] [aria-label="${label}"]`);
}

function getPanelButton(text) {
  return [...getPanel().querySelectorAll('button')].find((button) => button.textContent === text);
}

function getPanelRow(route) {
  return getPanel().querySelector(`[aria-label="${route} 이동 수단"]`).closest('li');
}

async function openEditing(entry) {
  await openMap(entry);
  await click(getEditButton());
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
  addMany = vi.fn().mockResolvedValue([]);
  vi.mocked(useCorrections).mockReturnValue({ status: 'ready', addMany });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

// 2Y 목록에서 밴쿠버 → 밴프(차 552km)를 기준으로 봐요.
const BANFF_ROUTE = '밴쿠버 → 밴프';
const BANFF_LEG = seojin.legs.find((leg) => Math.round(leg.km) === 552 && leg.mode === 'car');

describe('01 이동 수단 고치기 모드', () => {
  test('평소에는 라벨을 누를 수 없고, 범례의 고치기로 들어가요', async () => {
    await openMap();

    expect(getLabel('기차 · 343km').tagName).toBe('P');
    expect(getLabelButton('기차 · 343km')).toBeUndefined();
    expect(getPanel()).toBeNull();

    await click(getEditButton());

    expect(getLabelButton('기차 · 343km')).toBeDefined();
    expect(getPanel()).not.toBeNull();
    expect(container.querySelector('section[aria-label="이동 수단"]')).toBeNull();
  });

  test('들어가면 재생을 멈추고 끝으로 옮겨서 모든 라벨을 보여 줘요', async () => {
    window.matchMedia.mockReturnValue({ matches: false });
    await openMap();
    expect(usePlaybackStore.getState().isPlaying).toBe(true);
    expect(getLabel('기차 · 343km')).toBeUndefined();

    await click(getEditButton());

    expect(usePlaybackStore.getState().isPlaying).toBe(false);
    expect(usePlaybackStore.getState().elapsedMs).toBe(Infinity);
    expect(getLabelButton('기차 · 343km')).toBeDefined();
  });

  test('목록에는 집에서 나가는 구간을 빼고 모든 구간이 있어요', async () => {
    await openEditing();

    const editableLegs = usePlaybackStore.getState().legs.filter((leg) => leg.from !== 'home');
    const flightCount = editableLegs.filter((leg) => leg.mode === 'flight').length;
    expect(getPanel().querySelectorAll('li')).toHaveLength(editableLegs.length);
    // 지도에 라벨이 없는 자동 비행 구간도 목록에서는 고칠 수 있어요.
    expect(flightCount).toBeGreaterThan(0);
    expect(getPanel().querySelectorAll('[aria-label="비행"][aria-pressed="true"]')).toHaveLength(
      flightCount,
    );
  });

  test('목록 줄에 포커스하면 지도에서 그 구간을 진하게 그려요', async () => {
    await openEditing();

    await act(async () => getPanelModeButton(BANFF_ROUTE, '차').focus());

    expect(container.querySelector(`[data-leg-highlight="${BANFF_LEG.id}"]`)).not.toBeNull();
  });

  test('바꾼 게 없이 완료를 누르면 저장하지 않고 끝내요', async () => {
    await openEditing();

    await click(getPanelButton('완료'));

    expect(addMany).not.toHaveBeenCalled();
    expect(getPanel()).toBeNull();
    expect(getLabelButton('기차 · 343km')).toBeUndefined();
  });

  test('기간 탭을 바꾸면 고치기를 끝내요', async () => {
    await openEditing();

    await click([...container.querySelectorAll('button')].find((b) => b.textContent === '1y'));

    expect(getPanel()).toBeNull();
  });
});

describe('01 고치기 목록', () => {
  test('고르면 저장하지 않고 초안으로 보여 줘요', async () => {
    await openEditing();

    await click(getPanelModeButton(BANFF_ROUTE, '기차'));

    expect(addMany).not.toHaveBeenCalled();
    expect(getPanelModeButton(BANFF_ROUTE, '기차').getAttribute('aria-pressed')).toBe('true');
    expect(getPanelRow(BANFF_ROUTE).textContent).toContain('바꿈');
    expect(getPanel().textContent).toContain('1개 바꿨어요');
    // 지도 라벨도 고른 수단으로 바뀌어요.
    expect(getLabelButton('기차 · 552km')).toBeDefined();
  });

  test('저장된 수단으로 다시 고르면 초안에서 빠져요', async () => {
    await openEditing();

    await click(getPanelModeButton(BANFF_ROUTE, '기차'));
    await click(getPanelModeButton(BANFF_ROUTE, '차'));

    expect(getPanelRow(BANFF_ROUTE).textContent).not.toContain('바꿈');
    expect(getPanel().textContent).not.toContain('바꿨어요');
  });

  test('완료를 누르면 바꾼 구간을 출발 지점 사진으로 한꺼번에 저장하고 끝내요', async () => {
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));
    await click(
      getPanelModeButton(BANFF_ROUTE.replace('밴쿠버', '경주').replace('밴프', '서울'), '비행'),
    );

    await click(getPanelButton('완료'));

    const gyeongjuLeg = seojin.legs.find((leg) => Math.round(leg.km) === 285);
    expect(addMany).toHaveBeenCalledTimes(1);
    expect(addMany).toHaveBeenCalledWith([
      { type: 'mode', fromPhotoId: gyeongjuLeg.from, mode: 'flight' },
      { type: 'mode', fromPhotoId: BANFF_LEG.from, mode: 'train' },
    ]);
    expect(getPanel()).toBeNull();
    // Journey를 다시 계산하기 전까지 고른 수단이 그대로 보여요.
    expect(getLabel('기차 · 552km')).toBeDefined();
  });

  test('저장 뒤 다시 계산한 Journey가 오면 초안은 비고 저장된 값을 보여 줘요', async () => {
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));
    await click(getPanelButton('완료'));

    vi.mocked(useJourney).mockReturnValue({
      journey: withLeg(BANFF_LEG.id, { mode: 'train', modeSource: 'user' }),
      status: 'ready',
      error: null,
    });
    await openMap();
    await click(getEditButton());

    expect(getPanelModeButton(BANFF_ROUTE, '기차').getAttribute('aria-pressed')).toBe('true');
    expect(getPanelRow(BANFF_ROUTE).textContent).not.toContain('바꿈');
  });

  test('취소를 누르면 저장하지 않고 초안을 버려요', async () => {
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));

    await click(getPanelButton('취소'));

    expect(addMany).not.toHaveBeenCalled();
    expect(getPanel()).toBeNull();
    expect(getLabel('차 · 552km')).toBeDefined();
    expect(getLabel('기차 · 552km')).toBeUndefined();
  });

  test('Esc를 누르면 취소와 같아요', async () => {
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(addMany).not.toHaveBeenCalled();
    expect(getPanel()).toBeNull();

    await click(getEditButton());
    expect(getPanelModeButton(BANFF_ROUTE, '차').getAttribute('aria-pressed')).toBe('true');
  });

  test('저장에 실패하면 끝내지 않고 초안을 남겨서 다시 완료할 수 있어요', async () => {
    addMany.mockRejectedValueOnce({ status: 0, code: 'SAVE_FAILED', message: 'x' });
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));

    await click(getPanelButton('완료'));

    expect(getPanel().querySelector('[role="alert"]').textContent).toContain('저장하지 못했어요');
    expect(getPanelModeButton(BANFF_ROUTE, '기차').getAttribute('aria-pressed')).toBe('true');

    await click(getPanelButton('완료'));
    expect(addMany).toHaveBeenCalledTimes(2);
    expect(getPanel()).toBeNull();
  });

  test('보정을 불러오는 동안에는 고를 수 있지만 완료는 막아요', async () => {
    vi.mocked(useCorrections).mockReturnValue({ status: 'loading', addMany });
    await openEditing();
    await click(getPanelModeButton(BANFF_ROUTE, '기차'));

    await click(getPanelButton('완료'));

    expect(getPanelButton('완료').getAttribute('aria-disabled')).toBe('true');
    expect(addMany).not.toHaveBeenCalled();
    expect(getPanel()).not.toBeNull();
  });
});

describe('01 고치기 모드의 라벨 메뉴', () => {
  test('지점에서 출발하는 구간의 라벨은 눌러서 고칠 수 있어요', async () => {
    await openEditing();

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
    await openEditing(`/map?trip=${FUKUOKA_TRIP.id}`);

    expect(getLabel('기차 · 545km').tagName).toBe('P');
    expect(getLabelButton('기차 · 545km')).toBeUndefined();
  });

  test('라벨을 누르면 메뉴가 열리고 지금 이동 수단에 표시가 있어요', async () => {
    await openEditing();

    await click(getLabelButton('기차 · 343km'));

    expect(getMenu()).not.toBeNull();
    expect(getLabelButton('기차 · 343km').getAttribute('aria-expanded')).toBe('true');
    expect(getMenuItem('기차').getAttribute('aria-checked')).toBe('true');
    expect(getMenuItem('비행').getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(getMenuItem('기차'));
  });

  test('메뉴에서 고르면 초안에만 담고 닫아요. 완료를 눌러야 저장해요', async () => {
    await openEditing();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('차'));

    expect(addMany).not.toHaveBeenCalled();
    expect(getMenu()).toBeNull();
    expect(getLabelButton('차 · 343km')).toBeDefined();

    await click(getPanelButton('완료'));
    expect(addMany).toHaveBeenCalledWith([
      { type: 'mode', fromPhotoId: GRAD_TRAIN.from, mode: 'car' },
    ]);
  });

  test('지금 이동 수단을 고르면 바꾸지 않고 닫아요', async () => {
    await openEditing();
    await click(getLabelButton('기차 · 343km'));

    await click(getMenuItem('기차'));

    expect(getMenu()).toBeNull();
    expect(getPanel().textContent).not.toContain('바꿨어요');
  });

  test('Esc를 누르거나 메뉴 밖을 누르면 메뉴만 닫혀요', async () => {
    await openEditing();
    await click(getLabelButton('기차 · 343km'));

    await act(async () => {
      getMenuItem('기차').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(getMenu()).toBeNull();
    expect(getPanel()).not.toBeNull();

    await click(getLabelButton('기차 · 343km'));
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(getMenu()).toBeNull();
  });

  test('Esc나 고르기로 닫으면 연 라벨로 포커스가 돌아가요', async () => {
    await openEditing();
    await click(getLabelButton('기차 · 343km'));

    await act(async () => {
      getMenuItem('기차').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(getLabelButton('기차 · 343km'));

    await click(getLabelButton('기차 · 343km'));
    await click(getMenuItem('차'));
    expect(document.activeElement).toBe(getLabelButton('차 · 343km'));
  });

  test('열린 라벨을 다시 누르면 닫히고, 다른 라벨을 누르면 그 라벨의 메뉴로 바뀌어요', async () => {
    await openEditing();
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
    await openEditing();

    await click(getLabelButton('비행 · 343km'));

    expect(getMenuItem('비행').getAttribute('aria-checked')).toBe('true');
  });
});

describe('01 Journey 다시 계산 알림', () => {
  afterEach(() => {
    useCorrectionStore.setState({ journeyStatus: 'idle' });
  });

  test('계산 중이면 반영하는 중이라고 알려요', async () => {
    useCorrectionStore.setState({ journeyStatus: 'building' });
    await openMap();

    expect(container.querySelector('[role="status"]').textContent).toContain('반영하는 중');
  });

  test('실패하면 알리고 다시 시도로 다시 계산해요', async () => {
    const refreshJourney = vi.fn();
    const original = useCorrectionStore.getState().refreshJourney;
    useCorrectionStore.setState({ journeyStatus: 'failed', refreshJourney });
    await openMap();

    const alert = container.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('다시 정리하지 못했어요');
    await click(alert.querySelector('button'));
    expect(refreshJourney).toHaveBeenCalled();
    useCorrectionStore.setState({ refreshJourney: original });
  });

  test('계산이 끝났거나 한 적이 없으면 아무것도 안 그려요', async () => {
    useCorrectionStore.setState({ journeyStatus: 'saved' });
    await openMap();

    expect(container.textContent).not.toContain('반영하는 중');
    expect(container.textContent).not.toContain('다시 정리하지 못했어요');
  });
});
