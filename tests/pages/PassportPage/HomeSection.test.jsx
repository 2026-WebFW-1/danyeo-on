import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import empty from '@/data/fixtures/empty.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import PassportPage from '@/pages/PassportPage/PassportPage';

vi.mock('@/hooks/useCorrections', () => ({ useCorrections: vi.fn() }));
vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/hooks/usePhoto', () => ({ usePhoto: () => null }));

const pinned = { ...edge, home: { ...edge.home, source: 'user' } };
const unknownHome = { ...edge, home: null };
const homeLegPhotoId = edge.legs.find((leg) => leg.from === 'home').fromPhotoId;
const homeCorrections = [
  { id: 'c_h1', type: 'home', photoIds: ['p_old'] },
  { id: 'c_rename', type: 'rename', anchorPhotoId: 'p_x', name: 'x' },
  { id: 'c_h2', type: 'home', photoIds: ['p_new'] },
];

let container;
let root;
let corrections;

const render = async (journey) => {
  vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready', error: null });
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/passport']}>
        <Routes>
          <Route path="passport" element={<PassportPage />} />
          <Route path="upload" element={<p>올리기 화면</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
};

// 훅이 돌려주는 값을 바꿔 다시 그려요. journeyStatus가 바뀌는 것을 흉내 내요.
const rerender = async (journey, patch) => {
  corrections = { ...corrections, ...patch };
  vi.mocked(useCorrections).mockReturnValue(corrections);
  await render(journey);
};

const section = () => container.querySelector('section[aria-labelledby="passport-home"]');
const text = () => section().textContent;
const button = (name) =>
  [...section().querySelectorAll('button, a')].find((el) => el.textContent === name);
const click = (el) => act(async () => el.click());
const radios = () => [...section().querySelectorAll('input[type="radio"]')];
const rowOf = (city) => radios().find((radio) => radio.parentElement.textContent.startsWith(city));
const confirmButton = () => button('이곳을 집으로');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  corrections = {
    corrections: homeCorrections,
    status: 'ready',
    add: vi.fn().mockResolvedValue({}),
    removeMany: vi.fn().mockResolvedValue(undefined),
    journeyStatus: 'idle',
    refreshJourney: vi.fn(),
  };
  vi.mocked(useCorrections).mockReturnValue(corrections);
  vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'ready', error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('집 칸 닫힌 줄', () => {
  test('통계 줄과 입국 스탬프 사이에 있어요', async () => {
    await render(seojin);

    const sections = [...container.querySelectorAll('main > section')];
    const names = sections.map(
      (item) => item.getAttribute('aria-label') ?? item.getAttribute('aria-labelledby'),
    );
    expect(names.slice(0, 3)).toEqual(['여행 통계', 'passport-home', 'passport-visas']);
  });

  test('자동으로 잡은 집은 배지와 설명을 보여 주고 되돌리기는 없어요', async () => {
    await render(edge);

    expect(text()).toContain('HOME');
    expect(section().querySelector('h2').textContent).toBe('집');
    expect(text()).toContain('부산');
    expect(text()).toContain('자동으로 잡은 집');
    expect(text()).toContain(
      '사진이 가장 많이 찍힌 곳을 집으로 봤어요. 다르면 직접 고를 수 있어요.',
    );
    expect(button('집 바꾸기')).toBeDefined();
    expect(button('자동으로 되돌리기')).toBeUndefined();
  });

  test('직접 지정한 집은 배지가 바뀌고 자동으로 되돌리기가 나와요', async () => {
    await render(pinned);

    expect(text()).toContain('직접 지정한 집');
    expect(text()).toContain('여행마다 집에서 나가 집으로 돌아오는 것으로 동선을 그려요.');
    expect(button('자동으로 되돌리기')).toBeDefined();
  });
});

describe('집 고르기', () => {
  test('[집 바꾸기]를 누르면 목록이 펼쳐지고 버튼이 [닫기]로 바뀌어요', async () => {
    await render(edge);
    const toggle = button('집 바꾸기');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(section().querySelector('[role="radiogroup"]')).toBeNull();

    await click(toggle);

    expect(button('닫기').getAttribute('aria-expanded')).toBe('true');
    expect(section().querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(radios().length).toBeGreaterThan(5);
  });

  test('[닫기]를 누르면 목록이 접혀요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));

    await click(button('닫기'));

    expect(section().querySelector('[role="radiogroup"]')).toBeNull();
    expect(button('집 바꾸기')).toBeDefined();
  });

  test('목록 맨 위에 지금 집이 지금 집 배지와 함께 있어요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));

    expect(radios()[0].parentElement.textContent).toContain('부산');
    expect(radios()[0].parentElement.textContent).toContain('지금 집');
    expect(radios()[1].parentElement.textContent).not.toContain('지금 집');
    expect(radios()[1].parentElement.textContent).toMatch(/사진 \d+장/);
  });

  test('아무것도 안 골랐으면 안내만 있고 [이곳을 집으로]는 꺼져 있어요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));

    expect(text()).toContain('집으로 삼을 도시를 골라 주세요. 내 사진이 있는 도시만 나와요.');
    expect(confirmButton().disabled).toBe(true);
  });

  test('여행 지점을 고르면 기록에서 빠진다고 알리고 버튼이 켜져요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));

    await click(rowOf('방콕'));

    expect(rowOf('방콕').checked).toBe(true);
    expect(text()).toContain('방콕은 집이 되어 여행 기록에서 빠져요.');
    expect(confirmButton().disabled).toBe(false);
  });

  test('자동으로 잡힌 지금 집을 고르면 직접 지정한다고 알리고 버튼이 켜져요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));

    await click(rowOf('부산'));

    expect(text()).toContain('부산을 집으로 직접 지정해요.');
    expect(confirmButton().disabled).toBe(false);
  });

  test('이미 직접 지정한 지금 집을 고르면 버튼은 꺼져 있어요', async () => {
    await render(pinned);
    await click(button('집 바꾸기'));

    await click(rowOf('부산'));

    expect(confirmButton().disabled).toBe(true);
  });

  test('지금 집의 사진 ID를 못 찾으면 그 줄은 고를 수 없어요', async () => {
    const noHomeLegs = { ...edge, legs: edge.legs.filter((leg) => leg.from !== 'home') };
    await render(noHomeLegs);
    await click(button('집 바꾸기'));

    expect(rowOf('부산').disabled).toBe(true);
    expect(rowOf('방콕').disabled).toBe(false);
  });

  test('집 사진이 여행 뒤에만 있으면 내 사진에서 찾아 고를 수 있어요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({
      photos: [{ id: 'p_home', lat: 35.18, lng: 129.07, fileKey: null }],
      status: 'ready',
      error: null,
    });
    const noHomeLegs = { ...edge, legs: edge.legs.filter((leg) => leg.from !== 'home') };
    await render(noHomeLegs);
    await click(button('집 바꾸기'));
    await click(rowOf('부산'));
    await click(confirmButton());

    expect(corrections.add).toHaveBeenCalledWith({ type: 'home', photoIds: ['p_home'] });
  });
});

describe('저장', () => {
  test('[이곳을 집으로]는 고른 도시의 첫 사진 ID로 home 보정을 저장하고 목록을 닫아요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('도쿄'));

    await click(confirmButton());

    expect(corrections.add).toHaveBeenCalledWith({ type: 'home', photoIds: ['p_3ec040'] });
    expect(section().querySelector('[role="radiogroup"]')).toBeNull();
  });

  test('자동으로 잡힌 지금 집을 저장하면 집에서 나가는 구간의 사진 ID를 넘겨요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('부산'));

    await click(confirmButton());

    expect(corrections.add).toHaveBeenCalledWith({ type: 'home', photoIds: [homeLegPhotoId] });
  });

  test('보정을 보내는 동안 정리하는 중을 알리고 버튼을 꺼요', async () => {
    corrections.add.mockReturnValue(new Promise(() => {}));
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('도쿄'));
    await click(confirmButton());

    expect(section().querySelector('[role="status"]').textContent).toBe('여행을 정리하는 중…');
    expect(button('집 바꾸기').disabled).toBe(true);
  });

  test('보정은 저장됐고 Journey를 계산하는 동안에도 정리하는 중이에요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('도쿄'));
    await click(confirmButton());

    await rerender(edge, { journeyStatus: 'building' });

    expect(section().querySelector('[role="status"]').textContent).toBe('여행을 정리하는 중…');
    expect(button('집 바꾸기').disabled).toBe(true);

    await rerender(edge, { journeyStatus: 'saved' });

    expect(section().querySelector('[role="status"]')).toBeNull();
    expect(button('집 바꾸기').disabled).toBe(false);
  });

  test('보정 저장이 실패하면 안내와 [다시 시도]가 나오고, 누르면 같은 저장을 다시 해요', async () => {
    corrections.add.mockRejectedValueOnce(new Error('fail'));
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('도쿄'));
    await click(confirmButton());

    const alert = section().querySelector('[role="alert"]');
    expect(alert.textContent).toBe('집을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    expect(alert.className).toContain('text-accent');
    expect(button('집 바꾸기')).toBeUndefined();

    await click(button('다시 시도'));

    expect(corrections.add).toHaveBeenCalledTimes(2);
    expect(corrections.add).toHaveBeenLastCalledWith({ type: 'home', photoIds: ['p_3ec040'] });
    expect(corrections.refreshJourney).not.toHaveBeenCalled();
    expect(section().querySelector('[role="alert"]')).toBeNull();
  });

  test('보정은 저장됐는데 Journey 계산이 실패하면 [다시 시도]는 계산만 다시 해요', async () => {
    await render(edge);
    await click(button('집 바꾸기'));
    await click(rowOf('도쿄'));
    await click(confirmButton());
    await rerender(edge, { journeyStatus: 'failed' });

    expect(section().querySelector('[role="alert"]')).not.toBeNull();

    await click(button('다시 시도'));

    expect(corrections.refreshJourney).toHaveBeenCalledTimes(1);
    expect(corrections.add).toHaveBeenCalledTimes(1);
  });
});

describe('자동으로 되돌리기', () => {
  test('home 보정을 전부 지워요. 다른 종류의 보정은 두고, 확인 창은 없어요', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    corrections.removeMany.mockReturnValue(new Promise(() => {}));
    await render(pinned);

    await click(button('자동으로 되돌리기'));

    expect(corrections.removeMany).toHaveBeenCalledWith(['c_h1', 'c_h2']);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(section().querySelector('[role="status"]').textContent).toBe('여행을 정리하는 중…');
  });

  test('보정을 다 불러오기 전에는 누를 수 없어요', async () => {
    corrections.status = 'loading';
    vi.mocked(useCorrections).mockReturnValue(corrections);
    await render(pinned);

    expect(button('자동으로 되돌리기').disabled).toBe(true);
  });
});

describe('집을 모르는 계정', () => {
  test('안내와 [사진 올리기]가 나오고, 방문지가 있으면 [집 고르기]도 나와요', async () => {
    await render(unknownHome);

    expect(text()).toContain('아직 집을 몰라요');
    expect(text()).toContain(
      '집에서 찍은 사진을 한 장 올려 주세요. 위치 정보가 있는 사진이어야 해요.',
    );
    expect(button('사진 올리기').getAttribute('href')).toBe('/upload');
    expect(button('집 고르기')).toBeDefined();
  });

  test('[집 고르기]로 방문 도시를 집으로 고를 수 있어요', async () => {
    await render(unknownHome);
    await click(button('집 고르기'));

    expect(radios().some((radio) => radio.parentElement.textContent.includes('지금 집'))).toBe(
      false,
    );
    await click(rowOf('도쿄'));
    await click(confirmButton());

    expect(corrections.add).toHaveBeenCalledWith({ type: 'home', photoIds: ['p_3ec040'] });
  });

  test('고를 도시가 없으면 [사진 올리기]만 나와요', async () => {
    await render({ ...empty, trips: [{ ...seojin.trips[0] }] });

    expect(button('사진 올리기')).toBeDefined();
    expect(button('집 고르기')).toBeUndefined();
  });
});

describe('여행이 0개인 계정', () => {
  test('안내 위에 집 칸을 보여 줘요', async () => {
    await render(empty);

    expect(container.textContent).toContain('아직 여행이 없어요');
    expect(text()).toContain('아직 집을 몰라요');
    expect(text()).toContain(
      '사진을 올리면 집을 고를 수 있어요. 집에서 찍은 사진도 한 장 올려 주세요.',
    );
    expect(button('집 고르기')).toBeUndefined();
    expect(button('사진 올리기')).toBeDefined();
  });

  test('사진이 한 장도 없는 계정도 깨지지 않아요', async () => {
    await render(null);

    expect(text()).toContain('아직 집을 몰라요');
  });
});
