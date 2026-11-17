import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import PhotoSortPage from '@/pages/PhotoSortPage/PhotoSortPage';

vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/hooks/useCorrections', () => ({ useCorrections: vi.fn() }));

const bangkok = seojin.trips.find((trip) => trip.name === '방콕 · 다낭');

let container;
let root;
let location;
let corrections;

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 주소는 effect에서 테스트로 내보내요.
function LocationProbe({ onChange }) {
  const current = useLocation();
  useEffect(() => onChange(`${current.pathname}${current.search}`));
  return null;
}

async function render(path) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe
          onChange={(path) => {
            location = path;
          }}
        />
        <PhotoSortPage />
      </MemoryRouter>,
    ),
  );
}

function mockCorrections(overrides = {}) {
  corrections = {
    corrections: [],
    status: 'ready',
    error: null,
    add: vi.fn().mockResolvedValue({}),
    remove: vi.fn(),
    journeyStatus: 'idle',
    refreshJourney: vi.fn(),
    ...overrides,
  };
  vi.mocked(useCorrections).mockImplementation(() => corrections);
}

/** 사람이 입력한 것처럼 값을 바꿔요. React가 알아채도록 원래 setter로 넣어요. */
async function type(element, value) {
  const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  await act(async () => {
    set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function click(element) {
  await act(async () => element.click());
}

const tabs = () => [...container.querySelectorAll('nav[aria-label="사진 정리 탭"] button')];
const currentTab = () => tabs().find((tab) => tab.getAttribute('aria-current') === 'true');
const tripNames = () => [...container.querySelectorAll('h3')].map((h3) => h3.textContent);
const renameButton = (name) => container.querySelector(`button[aria-label="${name} 이름 바꾸기"]`);
const nameInput = () => container.querySelector('input[aria-label$="번 여행 이름"]');
const buttonByText = (text) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // 문서에 붙어 있어야 [저장]을 눌렀을 때 form이 제출돼요.
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(useJourney).mockReturnValue({ journey: seojin, status: 'ready', error: null });
  vi.mocked(useMyPhotos).mockReturnValue({
    photos: seojinSeed.photos,
    status: 'ready',
    error: null,
  });
  mockCorrections();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.resetAllMocks();
});

describe('PhotoSortPage 주소의 ?tab=', () => {
  test('?tab=이 없으면 여행 묶음이고, 여행을 모두 그려요', async () => {
    await render('/edit/photos');

    expect(currentTab().textContent).toContain('여행 묶음');
    expect(currentTab().textContent).toContain(String(seojin.trips.length));
    expect(tripNames()).toEqual(seojin.trips.map((trip) => trip.name));
  });

  test('?tab=이 가리키는 탭을 보여 주고, 모르는 값이면 여행 묶음이에요', async () => {
    await render('/edit/photos?tab=unlocated');
    expect(currentTab().textContent).toContain('위치 확인 필요');
    expect(tripNames()).toEqual([]);

    await act(async () => root.unmount());
    root = createRoot(container);
    await render('/edit/photos?tab=nope');
    expect(currentTab().textContent).toContain('여행 묶음');
  });

  test('탭을 누르면 주소의 ?tab=이 바뀌어요', async () => {
    await render('/edit/photos');

    await click(tabs().find((tab) => tab.textContent.includes('제외한 사진')));

    expect(location).toBe('/edit/photos?tab=excluded');
    expect(currentTab().textContent).toContain('제외한 사진');
  });
});

describe('PhotoSortPage 이름 바꾸기', () => {
  test('✎로 연 칸에서 저장하면 그 여행 첫 사진에 rename 보정을 더하고 칸을 닫아요', async () => {
    await render('/edit/photos');

    await click(renameButton('방콕 · 다낭'));
    expect(nameInput().value).toBe('방콕 · 다낭');
    await type(nameInput(), '  졸업 전 여행 ');
    await click(buttonByText('저장'));

    expect(corrections.add).toHaveBeenCalledWith({
      type: 'rename',
      anchorPhotoId: bangkok.id,
      name: '졸업 전 여행',
    });
    expect(nameInput()).toBeNull();
  });

  test('저장한 rename은 Journey를 다시 계산하기 전에도 표에 보여요', async () => {
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'rename', anchorPhotoId: bangkok.id, name: '졸업 전 여행' }],
    });
    await render('/edit/photos');

    expect(tripNames()[seojin.trips.indexOf(bangkok)]).toBe('졸업 전 여행');
  });

  test('바꾼 게 없거나 비워 두면 저장하지 않고 닫아요', async () => {
    await render('/edit/photos');

    await click(renameButton('방콕 · 다낭'));
    await click(buttonByText('저장'));
    await click(renameButton('방콕 · 다낭'));
    await type(nameInput(), '   ');
    await click(buttonByText('저장'));

    expect(corrections.add).not.toHaveBeenCalled();
    expect(nameInput()).toBeNull();
  });

  test('저장이 실패하면 입력한 이름을 그대로 두고 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({ add: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }) });
    await render('/edit/photos');

    await click(renameButton('방콕 · 다낭'));
    await type(nameInput(), '졸업 전 여행');
    await click(buttonByText('저장'));

    expect(nameInput().value).toBe('졸업 전 여행');
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      '이름을 저장하지 못했어요',
    );
  });

  test('보정을 다 불러오기 전에는 ✎를 누를 수 없어요', async () => {
    mockCorrections({ status: 'loading' });
    await render('/edit/photos');

    expect(renameButton('방콕 · 다낭').disabled).toBe(true);
  });
});

describe('PhotoSortPage Journey 계산 상태', () => {
  test('계산 중이면 정리하는 중이라고 알려요', async () => {
    mockCorrections({ journeyStatus: 'building' });
    await render('/edit/photos');

    expect(container.querySelector('[role="status"]').textContent).toContain('여행을 정리하는 중');
  });

  test('실패하면 [다시 시도]로 Journey를 다시 계산해요', async () => {
    mockCorrections({ journeyStatus: 'failed' });
    await render('/edit/photos');

    await click(buttonByText('다시 시도'));

    expect(corrections.refreshJourney).toHaveBeenCalledTimes(1);
  });
});

const stopOf = (id) => seojin.stops.find((stop) => stop.id === id);
const bangkokPhotoIds = bangkok.stopIds.flatMap((id) => stopOf(id).photoIds);
const listItems = (label) => [
  ...(container.querySelector(`ul[aria-label="${label}"]`)?.children ?? []),
];
const buttonsByText = (text) =>
  [...container.querySelectorAll('button')].filter((button) => button.textContent === text);

describe('PhotoSortPage 사진 빼기', () => {
  test('⋯를 누르면 그 여행 사진을 펼치고, [빼기]는 그 사진에 exclude 보정을 더해요', async () => {
    await render('/edit/photos');

    const toggle = container.querySelector('button[aria-label="방콕 · 다낭 사진 펼쳐 빼기"]');
    await click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(bangkokPhotoIds.length);

    await click(buttonsByText('빼기')[0]);

    expect(corrections.add).toHaveBeenCalledWith({ type: 'exclude', photoId: bangkokPhotoIds[0] });
  });

  test('빼기가 실패하면 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({ add: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }) });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼쳐 빼기"]'));
    await click(buttonsByText('빼기')[0]);

    expect(container.querySelector('[role="alert"]').textContent).toBe('사진을 빼지 못했어요');
  });

  test('뺀 사진은 Journey를 다시 계산하기 전에도 펼친 목록에서 빠지고 제외한 사진 수에 들어가요', async () => {
    mockCorrections({ corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }] });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼쳐 빼기"]'));

    expect(listItems('방콕 · 다낭 사진')).toHaveLength(bangkokPhotoIds.length - 1);
    expect(tabs().find((tab) => tab.textContent.includes('제외한 사진')).textContent).toContain(
      '1',
    );
  });

  test('사진이 많으면 48장만 그리고 [더 보기]로 늘려요', async () => {
    const [firstStopId] = bangkok.stopIds;
    const manyIds = Array.from({ length: 60 }, (_, index) => `p_many_${index}`);
    const journey = {
      ...seojin,
      stops: seojin.stops.map((stop) =>
        stop.id === firstStopId ? { ...stop, photoIds: manyIds, photoCount: manyIds.length } : stop,
      ),
    };
    vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready', error: null });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼쳐 빼기"]'));
    const total = manyIds.length + stopOf(bangkok.stopIds[1]).photoIds.length;
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(48);

    await click(buttonsByText(`더 보기 ${total - 48}`)[0]);
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(total);
  });

  test('보정을 다 불러오기 전에는 [빼기]를 누를 수 없어요', async () => {
    mockCorrections({ status: 'loading' });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼쳐 빼기"]'));

    expect(buttonsByText('빼기').every((button) => button.disabled)).toBe(true);
  });
});

describe('PhotoSortPage 제외한 사진', () => {
  test('뺀 사진을 보여 주고, [복구]는 그 사진의 exclude를 모두 지워요', async () => {
    const [photoId] = bangkokPhotoIds;
    mockCorrections({
      corrections: [
        { id: 'c_1', type: 'exclude', photoId },
        { id: 'c_2', type: 'exclude', photoId },
      ],
      remove: vi.fn().mockResolvedValue(),
    });
    await render('/edit/photos?tab=excluded');

    expect(listItems('뺀 사진')).toHaveLength(1);

    await click(buttonByText('복구'));

    expect(corrections.remove).toHaveBeenCalledTimes(2);
    expect(corrections.remove).toHaveBeenCalledWith('c_2');
    expect(corrections.remove).toHaveBeenCalledWith('c_1');
  });

  test('복구가 실패하면 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
      remove: vi.fn().mockRejectedValue({ code: 'REMOVE_FAILED' }),
    });
    await render('/edit/photos?tab=excluded');

    await click(buttonByText('복구'));

    expect(container.querySelector('[role="alert"]').textContent).toBe('복구하지 못했어요');
  });

  test('뺀 사진이 없으면 안내하고, 보정을 불러오는 중이면 기다린다고 알려요', async () => {
    await render('/edit/photos?tab=excluded');
    expect(container.textContent).toContain('뺀 사진이 없어요');

    mockCorrections({ status: 'loading' });
    await render('/edit/photos?tab=excluded');
    expect(container.querySelector('[role="status"]').textContent).toContain(
      '뺀 사진을 불러오는 중',
    );
  });
});
