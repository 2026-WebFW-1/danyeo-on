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
    addMany: vi.fn().mockResolvedValue([]),
    removeMany: vi.fn().mockResolvedValue(),
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
const tripNames = () =>
  [...container.querySelectorAll('section[aria-label="여행 묶음"] h3')].map((h3) => h3.textContent);
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

describe('PhotoSortPage 사진 불러오기', () => {
  test('사진을 받는 동안은 표 대신 불러오는 중이라고 알려요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({ photos: [], status: 'loading', error: null });
    await render('/edit/photos');

    expect(container.querySelector('[role="status"]').textContent).toContain('불러오는 중');
    expect(tripNames()).toEqual([]);
  });

  test('사진을 못 받으면 "불러온 사진 0" 대신 안내해요', async () => {
    vi.mocked(useMyPhotos).mockReturnValue({
      photos: [],
      status: 'error',
      error: { status: 500, code: 'LOAD_FAILED', message: '' },
    });
    await render('/edit/photos');

    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '사진을 불러오지 못했어요. 새로고침해 주세요.',
    );
    expect(container.textContent).not.toContain('불러온 사진');
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

    const toggle = container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]');
    await click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(bangkokPhotoIds.length);

    await click(buttonsByText('빼기')[0]);

    expect(corrections.addMany).toHaveBeenCalledWith([
      { type: 'exclude', photoId: bangkokPhotoIds[0] },
    ]);
  });

  test('빼기가 실패하면 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({ addMany: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }) });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));
    await click(buttonsByText('빼기')[0]);

    expect(container.querySelector('[role="alert"]').textContent).toBe('사진을 빼지 못했어요');
  });

  test('뺀 사진은 Journey를 다시 계산하기 전에도 펼친 목록에서 빠지고 제외한 사진 수에 들어가요', async () => {
    mockCorrections({ corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }] });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));

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

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));
    const total = manyIds.length + stopOf(bangkok.stopIds[1]).photoIds.length;
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(48);

    await click(buttonsByText(`더 보기 ${total - 48}`)[0]);
    expect(listItems('방콕 · 다낭 사진')).toHaveLength(total);
  });

  test('보정을 다 불러오기 전에는 [빼기]를 누를 수 없어요', async () => {
    mockCorrections({ status: 'loading' });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));

    expect(buttonsByText('빼기').every((button) => button.disabled)).toBe(true);
  });
});

describe('PhotoSortPage 여행 나누기', () => {
  const secondTripFirstPhotoId = () => stopOf(seojin.trips[1].stopIds[0]).photoIds[0];
  const openBangkok = () =>
    click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));

  test('[여기서 나누기]는 그 사진에 split 보정을 더하고, 첫 사진에는 없어요', async () => {
    await render('/edit/photos');
    await openBangkok();

    expect(buttonsByText('여기서 나누기')).toHaveLength(bangkokPhotoIds.length - 1);

    await click(buttonsByText('여기서 나누기')[0]);

    expect(corrections.add).toHaveBeenCalledExactlyOnceWith({
      type: 'split',
      beforePhotoId: bangkokPhotoIds[1],
    });
  });

  test('나누기가 실패하면 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({ add: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }) });
    await render('/edit/photos');
    await openBangkok();

    await click(buttonsByText('여기서 나누기')[0]);

    expect(container.querySelector('[role="alert"]').textContent).toBe('여행을 나누지 못했어요');
  });

  test('저장한 나누기는 다시 계산하기 전까지 그 사진에 정리 중이라고 적고 [여기서 나누기]를 숨겨요', async () => {
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'split', beforePhotoId: bangkokPhotoIds[2] }],
    });
    await render('/edit/photos');
    await openBangkok();

    const card = listItems('방콕 · 다낭 사진')[2];
    expect(card.textContent).toContain('여기서 나눠요 · 정리 중');
    expect(buttonsByText('여기서 나누기')).toHaveLength(bangkokPhotoIds.length - 2);
  });

  test('나눠서 생긴 줄의 [나누기 취소]는 그 줄을 떼어 낸 split을 모두 지워요', async () => {
    // 두 번째 여행의 첫 사진 앞에서 나눈 뒤 다시 계산한 상태예요. 첫 여행은 앞 여행이 없어 나눌 수 없어요.
    const firstPhotoId = secondTripFirstPhotoId();
    mockCorrections({
      corrections: [
        { id: 'c_1', type: 'split', beforePhotoId: firstPhotoId },
        { id: 'c_2', type: 'split', beforePhotoId: firstPhotoId },
      ],
    });
    await render('/edit/photos');

    const undoButtons = buttonsByText('나누기 취소');
    expect(undoButtons).toHaveLength(1);

    await click(undoButtons[0]);

    expect(corrections.removeMany).toHaveBeenCalledExactlyOnceWith(['c_1', 'c_2']);
  });

  test('나누기 취소가 실패하면 버튼 옆에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'split', beforePhotoId: secondTripFirstPhotoId() }],
      removeMany: vi.fn().mockRejectedValue({ code: 'REMOVE_FAILED' }),
    });
    await render('/edit/photos');

    await click(buttonByText('나누기 취소'));

    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '나누기를 취소하지 못했어요',
    );
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
      removeMany: vi.fn().mockResolvedValue(),
    });
    await render('/edit/photos?tab=excluded');

    expect(listItems('뺀 사진')).toHaveLength(1);

    await click(buttonByText('복구'));

    expect(corrections.removeMany).toHaveBeenCalledExactlyOnceWith(['c_2', 'c_1']);
  });

  test('복구가 실패하면 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
      removeMany: vi.fn().mockRejectedValue({ code: 'REMOVE_FAILED' }),
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

describe('PhotoSortPage 위치 확인 필요', () => {
  const [early, late] = seojinSeed.photos
    .filter((photo) => photo.takenAt)
    .toSorted((a, b) => a.takenAt.localeCompare(b.takenAt))
    .filter((photo, index, sorted) => index === 0 || index === sorted.length - 1);
  const noDate = { ...early, id: 'p_nodate', takenAt: null, fileKey: null };
  const groupTitles = () =>
    [...container.querySelectorAll('section[aria-label="위치 확인 필요"] h3')].map(
      (h3) => h3.textContent,
    );
  const excludeButton = (title) =>
    container.querySelector(`button[aria-label^="${title} 사진"][aria-label$="타임라인에서 제외"]`);

  beforeEach(() => {
    vi.mocked(useJourney).mockReturnValue({
      journey: { ...seojin, unlocated: ['p_nodate', late.id, early.id] },
      status: 'ready',
      error: null,
    });
    vi.mocked(useMyPhotos).mockReturnValue({
      photos: [...seojinSeed.photos, noDate],
      status: 'ready',
      error: null,
    });
  });

  const dateOf = (photo) => photo.takenAt.slice(0, 10).replaceAll('-', '.');

  test('찍은 날짜별로 묶고, 날짜가 없는 사진은 맨 뒤 "날짜 없음"이에요', async () => {
    await render('/edit/photos?tab=unlocated');

    expect(groupTitles()).toEqual([dateOf(early), dateOf(late), '날짜 없음']);
    expect(container.textContent).toContain('타임라인에 놓지 못한 사진 3장');
  });

  test('[타임라인에서 제외]는 그 묶음의 사진을 모두 빼요', async () => {
    await render('/edit/photos?tab=unlocated');

    await click(excludeButton('날짜 없음'));

    expect(corrections.addMany).toHaveBeenCalledExactlyOnceWith([
      { type: 'exclude', photoId: 'p_nodate' },
    ]);
  });

  test('뺀 사진은 묶음에서 바로 빠지고, 빼기가 실패하면 묶음에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: early.id }],
      addMany: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }),
    });
    await render('/edit/photos?tab=unlocated');

    expect(groupTitles()).toEqual([dateOf(late), '날짜 없음']);

    await click(excludeButton('날짜 없음'));

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      '일부 사진을 빼지 못했어요',
    );
  });

  test('사진이 여럿인 묶음도 한 번에 빼서, Journey 계산이 한 번만 일어나요', async () => {
    const sameDay = { ...early, id: 'p_sameday' };
    vi.mocked(useJourney).mockReturnValue({
      journey: { ...seojin, unlocated: [early.id, sameDay.id] },
      status: 'ready',
      error: null,
    });
    vi.mocked(useMyPhotos).mockReturnValue({
      photos: [...seojinSeed.photos, sameDay],
      status: 'ready',
      error: null,
    });
    await render('/edit/photos?tab=unlocated');

    await click(excludeButton(dateOf(early)));

    expect(corrections.add).not.toHaveBeenCalled();
    expect(corrections.addMany).toHaveBeenCalledExactlyOnceWith([
      { type: 'exclude', photoId: early.id },
      { type: 'exclude', photoId: sameDay.id },
    ]);
  });

  test('마지막 묶음까지 빼서 비면, 여행에 들어갔다고 하지 않고 확인할 사진이 없다고만 해요', async () => {
    mockCorrections({
      corrections: ['p_nodate', late.id, early.id].map((photoId) => ({
        id: `c_${photoId}`,
        type: 'exclude',
        photoId,
      })),
    });
    await render('/edit/photos?tab=unlocated');

    expect(groupTitles()).toEqual([]);
    expect(container.textContent).toContain('위치를 확인할 사진이 없어요.');
    expect(container.textContent).not.toContain('여행에 들어갔어요');
  });

  test('보정을 다 불러오기 전에는 제외할 수 없어요', async () => {
    mockCorrections({ status: 'loading' });
    await render('/edit/photos?tab=unlocated');

    expect(excludeButton('날짜 없음').disabled).toBe(true);
  });

  test('위치를 확인할 사진이 없으면 안내해요', async () => {
    vi.mocked(useJourney).mockReturnValue({
      journey: { ...seojin, unlocated: [] },
      status: 'ready',
      error: null,
    });
    await render('/edit/photos?tab=unlocated');

    expect(container.textContent).toContain('위치를 확인할 사진이 없어요');
  });
});

describe('PhotoSortPage 이름을 정한 사진 빼기', () => {
  test('이름을 정한 기준 사진을 빼면, 남은 사진으로 같은 이름을 먼저 걸고 빼요', async () => {
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'rename', anchorPhotoId: bangkok.id, name: '졸업 전 여행' }],
    });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="졸업 전 여행 사진 펼치기"]'));
    await click(buttonsByText('빼기')[0]);

    expect(bangkokPhotoIds[0]).toBe(bangkok.id);
    expect(corrections.addMany).toHaveBeenCalledExactlyOnceWith([
      { type: 'rename', anchorPhotoId: bangkokPhotoIds[1], name: '졸업 전 여행' },
      { type: 'exclude', photoId: bangkok.id },
    ]);
  });
});

describe('PhotoSortPage 한 여행의 요청은 하나씩', () => {
  test('첫 사진을 뺀 뒤 이름을 바꾸면 남은 첫 사진에 rename을 걸어요', async () => {
    mockCorrections({ corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkok.id }] });
    await render('/edit/photos');

    await click(renameButton('방콕 · 다낭'));
    await type(nameInput(), '졸업 전 여행');
    await click(buttonByText('저장'));

    expect(corrections.add).toHaveBeenCalledExactlyOnceWith({
      type: 'rename',
      anchorPhotoId: bangkokPhotoIds[1],
      name: '졸업 전 여행',
    });
  });

  test('빼기가 끝날 때까지 그 여행의 ✎ · 다른 [빼기]를 막고, 끝나면 풀어요', async () => {
    let finish;
    mockCorrections({
      addMany: vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));
    await click(buttonsByText('빼기')[0]);

    expect(buttonsByText('빼기').every((button) => button.disabled)).toBe(true);
    expect(renameButton('방콕 · 다낭').disabled).toBe(true);
    // 다른 여행은 막지 않아요.
    expect(renameButton(seojin.trips.find((trip) => trip !== bangkok).name).disabled).toBe(false);

    await act(async () => finish([]));

    expect(buttonsByText('빼기').every((button) => !button.disabled)).toBe(true);
    expect(renameButton('방콕 · 다낭').disabled).toBe(false);
  });

  test('이름을 저장하는 동안에는 그 여행의 [빼기]를 막아요', async () => {
    let finish;
    mockCorrections({
      add: vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    });
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="방콕 · 다낭 사진 펼치기"]'));
    await click(renameButton('방콕 · 다낭'));
    await type(nameInput(), '졸업 전 여행');
    await click(buttonByText('저장'));

    expect(buttonsByText('빼기').every((button) => button.disabled)).toBe(true);

    await act(async () => finish({}));

    expect(buttonsByText('빼기').every((button) => !button.disabled)).toBe(true);
  });
});
