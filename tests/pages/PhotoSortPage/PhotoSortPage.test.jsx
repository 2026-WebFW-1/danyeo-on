import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import edgeGroup from '@/data/fixtures/edge.group.json';
import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import edgeSeed from '@/data/seed/edge.json';
import seojinSeed from '@/data/seed/seojin.json';
import { useCorrections } from '@/hooks/useCorrections';
import { useJourney } from '@/hooks/useJourney';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import MapPage from '@/pages/MapPage/MapPage';
import PlacesPage from '@/pages/PlacesPage/PlacesPage';
import { buildJourney } from '@/utils/journey/buildJourney';
import PhotoSortPage from '@/pages/PhotoSortPage/PhotoSortPage';

import { addCorrection, removeCorrection } from '@/services/correctionService';
import { refreshJourney } from '@/services/journeyService';
import { clearMyPhotos } from '@/services/myPhotosService';
import { deleteAllMyData } from '@/services/myDataService';
import { deletePhotos } from '@/services/photoService';
import { useAuthStore } from '@/stores/authStore';
import { useCorrectionStore } from '@/stores/correctionStore';
import { usePostStore } from '@/stores/postStore';
import { useUploadStore } from '@/stores/upload/uploadStore';

vi.mock('@/services/correctionService', () => ({
  addCorrection: vi.fn(),
  removeCorrection: vi.fn(),
  getCorrections: vi.fn(),
  moveCorrectionPhoto: vi.fn(),
}));
vi.mock('@/services/journeyService', async (original) => ({
  ...(await original()),
  refreshJourney: vi.fn(),
}));
vi.mock('@/services/myPhotosService', async (original) => ({
  ...(await original()),
  clearMyPhotos: vi.fn(),
}));
vi.mock('@/services/photoService', async (original) => ({
  ...(await original()),
  deletePhotos: vi.fn(),
}));
vi.mock('@/services/myDataService', () => ({ deleteAllMyData: vi.fn() }));
vi.mock('@/hooks/useLoadPosts', () => ({ useLoadPosts: () => 'ready' }));
vi.mock('@/hooks/useJourney', () => ({ useJourney: vi.fn() }));
vi.mock('@/hooks/useMyPhotos', () => ({ useMyPhotos: vi.fn() }));
vi.mock('@/hooks/useCorrections', () => ({ useCorrections: vi.fn() }));
// 공항 목록은 따로 받아 오는 파일이라, 도하 하마드 공항 하나만 든 목록으로 바꿔요.
const AIRPORTS = vi.hoisted(() => [{ lat: 25.273, lng: 51.608 }]);
vi.mock('@/hooks/useAirports', () => ({ useAirports: () => AIRPORTS }));

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
    // 스토어처럼 지금 보정 목록으로 옮길 것을 정하고, 정한 것을 돌려줘요.
    moveAnchors: vi.fn(async (buildMoves) => buildMoves(corrections.corrections)),
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
// 확인 창은 document.body에 그려져서(portal) container 밖에서 찾아요.
const dialog = () => document.querySelector('[role="dialog"]');
const dialogButton = (text) =>
  [...dialog().querySelectorAll('button')].find((button) => button.textContent === text);

/** 줄의 [영구 삭제]를 누르고, 확인 창에서도 [영구 삭제]를 눌러요. */
async function confirmDelete() {
  await click(buttonByText('영구 삭제'));
  await click(dialogButton('영구 삭제'));
}

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

  test('[영구 삭제]를 묻는 창에서 취소하면 아무것도 지우지 않아요', async () => {
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
    });
    await render('/edit/photos?tab=excluded');

    await click(buttonByText('영구 삭제'));

    expect(dialog().textContent).toContain(
      '다녀온에서 이 사진을 영구 삭제할까요?삭제 후에는 복구할 수 없어요.',
    );
    // 묻는 동안에는 지우는 중이 아니에요.
    expect(buttonByText('삭제하는 중…')).toBeUndefined();

    await click(dialogButton('취소'));

    expect(dialog()).toBeNull();
    expect(deletePhotos).not.toHaveBeenCalled();
    expect(corrections.removeMany).not.toHaveBeenCalled();
  });

  test('[영구 삭제]를 확인하면 그 사진 한 장만 지우고, 그 사진의 exclude를 모두 지워요', async () => {
    const [first, second] = bangkokPhotoIds;
    vi.mocked(deletePhotos).mockResolvedValue([second]);
    mockCorrections({
      corrections: [
        { id: 'c_1', type: 'exclude', photoId: first },
        { id: 'c_2', type: 'exclude', photoId: second },
        { id: 'c_3', type: 'exclude', photoId: second },
      ],
      removeMany: vi.fn().mockResolvedValue(),
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    expect(deletePhotos).toHaveBeenCalledExactlyOnceWith([second]);
    expect(clearMyPhotos).toHaveBeenCalledOnce();
    expect(corrections.removeMany).toHaveBeenCalledExactlyOnceWith(['c_3', 'c_2']);
  });

  test('지우기 전에 그 사진에 건 split 기준을 다음 사진으로 옮기고, 옮긴 뒤에 사진을 지워요', async () => {
    const [, second, third] = bangkokPhotoIds;
    const calls = [];
    vi.mocked(deletePhotos).mockImplementation(async (ids) => {
      calls.push('deletePhotos');
      return ids;
    });
    mockCorrections({
      corrections: [
        { id: 'c_split', type: 'split', beforePhotoId: second },
        { id: 'c_1', type: 'exclude', photoId: second },
      ],
      moveAnchors: vi.fn(async (buildMoves) => {
        calls.push('moveAnchors');
        return buildMoves(corrections.corrections);
      }),
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    await expect(corrections.moveAnchors.mock.results[0].value).resolves.toEqual([
      { correctionId: 'c_split', fromPhotoId: second, toPhotoId: third },
    ]);
    expect(calls).toEqual(['moveAnchors', 'deletePhotos']);
  });

  test('기준 옮기기가 실패하면 사진을 지우지 않고 그 사진 칸에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
      moveAnchors: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }),
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    expect(deletePhotos).not.toHaveBeenCalled();
    expect(corrections.removeMany).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '사진을 지우지 못했어요. 다시 눌러 주세요',
    );
  });

  test('사진을 지우지 못하면 옮긴 기준을 되돌리고, 그 사진 칸에 안내해요', async () => {
    const [, second, third] = bangkokPhotoIds;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deletePhotos).mockRejectedValue(new Error('network'));
    mockCorrections({
      corrections: [
        { id: 'c_split', type: 'split', beforePhotoId: second },
        { id: 'c_1', type: 'exclude', photoId: second },
      ],
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    expect(corrections.moveAnchors).toHaveBeenCalledTimes(2);
    expect(clearMyPhotos).not.toHaveBeenCalled();
    await expect(corrections.moveAnchors.mock.results[1].value).resolves.toEqual([
      { correctionId: 'c_split', fromPhotoId: third, toPhotoId: second },
    ]);
    expect(corrections.removeMany).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '사진을 지우지 못했어요. 다시 눌러 주세요',
    );
  });

  test('지우는 동안 그 사진의 [복구] · [영구 삭제]를 막아요', async () => {
    vi.mocked(deletePhotos).mockReturnValue(new Promise(() => {}));
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    expect(buttonByText('복구').disabled).toBe(true);
    expect(buttonByText('삭제하는 중…').disabled).toBe(true);
  });

  test('한 장을 지우는 동안 다른 사진의 [영구 삭제]를 막고, 끝나면 다시 풀어요', async () => {
    const [first, second] = bangkokPhotoIds;
    let finishDelete;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deletePhotos).mockReturnValue(
      new Promise((_, reject) => {
        finishDelete = () => reject(new Error('network'));
      }),
    );
    mockCorrections({
      corrections: [
        { id: 'c_1', type: 'exclude', photoId: first },
        { id: 'c_2', type: 'exclude', photoId: second },
      ],
    });
    await render('/edit/photos?tab=excluded');

    await confirmDelete();

    const otherDelete = buttonByText('영구 삭제');
    expect(otherDelete.disabled).toBe(true);
    await click(otherDelete);
    expect(deletePhotos).toHaveBeenCalledOnce();

    await act(async () => finishDelete());

    const deleteButtons = [...container.querySelectorAll('button')].filter(
      (button) => button.textContent === '영구 삭제',
    );
    expect(deleteButtons).toHaveLength(2);
    expect(deleteButtons.every((button) => !button.disabled)).toBe(true);
  });

  test('영구 삭제가 실패하면 그 사진 칸에 안내하고, 다시 누르면 다시 지워요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deletePhotos)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([bangkokPhotoIds[0]]);
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
      removeMany: vi.fn().mockResolvedValue(),
    });
    await render('/edit/photos?tab=excluded');
    await confirmDelete();

    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '사진을 지우지 못했어요. 다시 눌러 주세요',
    );
    expect(corrections.removeMany).not.toHaveBeenCalled();

    await confirmDelete();

    expect(deletePhotos).toHaveBeenCalledTimes(2);
    expect(corrections.removeMany).toHaveBeenCalledExactlyOnceWith(['c_1']);
    expect(container.querySelector('[role="alert"]')).toBeNull();
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

describe('07a 경유 지점', () => {
  const doha = edge.stops.find((stop) => stop.transit);
  const transit = { id: 'c_edge_1', type: 'transit', photoIds: doha.photoIds };
  const markButton = () => container.querySelector('button[aria-label="도하 경유로 처리"]');
  const notice = () => container.querySelector('section[aria-label="경유 감지 안내"]');
  const dohaChip = () =>
    [...container.querySelectorAll('ul[aria-label="도시"] li')].find((li) =>
      li.textContent.startsWith('도하'),
    );

  /** 경유 보정이 없는 edge예요. 도하가 비행기로 오가며 공항에 잠깐 머문 도시로 잡혀요. */
  async function mockEdgeWithoutTransit() {
    const findPlace = (lat, lng) =>
      edgeGroup.stops.reduce((nearest, stop) =>
        Math.hypot(stop.lat - lat, stop.lng - lng) <
        Math.hypot(nearest.lat - lat, nearest.lng - lng)
          ? stop
          : nearest,
      ).place;
    const journey = await buildJourney(edgeSeed.photos, [], findPlace);
    vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready', error: null });
    vi.mocked(useMyPhotos).mockReturnValue({ photos: edgeSeed.photos, status: 'ready' });
  }

  test('경유 후보를 물어보고, [경유로 처리]는 그 지점의 사진을 모두 transit 보정에 넣어요', async () => {
    await mockEdgeWithoutTransit();
    await render('/edit/photos');

    expect(notice().querySelectorAll('li')).toHaveLength(1);
    expect(notice().textContent).toContain('도하에서 찍은 사진 1장이 도시로 잡혔어요');
    expect(notice().textContent).toContain('2025.04.10 · 잠깐 머묾');
    expect(dohaChip().textContent).toBe('도하1일');

    await click(markButton());

    expect(corrections.add).toHaveBeenCalledExactlyOnceWith({
      type: 'transit',
      photoIds: doha.photoIds,
    });
  });

  test('저장한 경유는 Journey를 다시 계산하기 전에도 흐린 칩이 되고 안내에서 빠져요', async () => {
    await mockEdgeWithoutTransit();
    mockCorrections({ corrections: [transit] });
    await render('/edit/photos');

    expect(notice()).toBeNull();
    expect(dohaChip().textContent).toBe('도하경유');
  });

  test('경유로 처리하지 못하면 그 상자에 안내하고 다시 누를 수 있어요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mockEdgeWithoutTransit();
    mockCorrections({ add: vi.fn().mockRejectedValue({ code: 'SAVE_FAILED' }) });
    await render('/edit/photos');

    await click(markButton());

    expect(notice().querySelector('[role="alert"]').textContent).toBe(
      '경유로 처리하지 못했어요. 다시 시도해 주세요.',
    );
    expect(markButton().disabled).toBe(false);
  });

  test('보정을 다 불러오기 전에는 경유로 처리할 수 없어요', async () => {
    await mockEdgeWithoutTransit();
    mockCorrections({ status: 'loading' });
    await render('/edit/photos');

    expect(markButton().disabled).toBe(true);
  });

  test('[도시로 둘게요]는 보정 없이 안내를 닫고, 다시 들어와도 닫혀 있어요', async () => {
    onTestFinished(() => localStorage.clear());
    await mockEdgeWithoutTransit();
    await render('/edit/photos');

    await click(container.querySelector('button[aria-label="도하 도시로 둘게요"]'));

    expect(notice()).toBeNull();
    expect(corrections.add).not.toHaveBeenCalled();
    expect(dohaChip().textContent).toBe('도하1일');

    await act(async () => root.unmount());
    root = createRoot(container);
    await render('/edit/photos');

    expect(notice()).toBeNull();
  });

  test('[도하 경유 취소]는 그 지점의 transit 보정을 모두 지워요', async () => {
    vi.mocked(useJourney).mockReturnValue({ journey: edge, status: 'ready', error: null });
    mockCorrections({ corrections: [transit, { ...transit, id: 'c_again' }] });
    await render('/edit/photos');

    expect(notice()).toBeNull();
    await click(buttonByText('도하 경유 취소'));

    expect(corrections.removeMany).toHaveBeenCalledExactlyOnceWith(['c_edge_1', 'c_again']);
  });

  test('경유 취소가 실패하면 버튼 옆에 안내해요', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useJourney).mockReturnValue({ journey: edge, status: 'ready', error: null });
    mockCorrections({
      corrections: [transit],
      removeMany: vi.fn().mockRejectedValue({ code: 'REMOVE_FAILED' }),
    });
    await render('/edit/photos');

    await click(buttonByText('도하 경유 취소'));

    expect(container.querySelector('[role="alert"]').textContent).toBe(
      '도하 경유를 취소하지 못했어요',
    );
  });
});

describe('07a에서 여행 합치기', () => {
  const checkboxes = () => [...container.querySelectorAll('input[type="checkbox"]')];

  test('이웃하지 않은 선택을 막고, 저장이 실패하면 두 줄을 유지해 다시 보낼 수 있어요', async () => {
    // given
    corrections.add.mockRejectedValueOnce(new Error('저장 실패'));
    await render('/edit/photos');
    const [a, b, c] = checkboxes();
    // when
    await click(a);
    expect(c.disabled).toBe(true);
    await click(b);
    await click(buttonByText('합치기'));
    // then
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      '여행을 합치지 못했어요',
    );
    expect([a.checked, b.checked]).toEqual([true, true]);
    await click(buttonByText('합치기'));
    expect(corrections.add).toHaveBeenCalledTimes(2);
    expect([a.checked, b.checked]).toEqual([false, false]);
  });

  test.each(['building', 'failed'])(
    '계산 상태가 %s이면 합치기를 보낼 수 없어요',
    async (journeyStatus) => {
      // given
      mockCorrections({ journeyStatus });
      // when
      await render('/edit/photos');
      // then
      expect(checkboxes().every((box) => box.disabled)).toBe(true);
      expect(buttonByText('합치기').disabled).toBe(true);
    },
  );

  test('아래 줄부터 선택해 합친 뒤 01·03을 보고, 취소하면 두 여행이 돌아와요', async () => {
    // given: 서울 집 → 방콕 → 서울 집 → 다낭
    const photo = (id, day, lat, lng) => ({
      id,
      takenAt: `2025-03-${day}T12:00:00`,
      offset: '+09:00',
      lat,
      lng,
      fileKey: null,
    });
    const photos = [
      photo('h1', '01', 37.5, 127),
      photo('h2', '02', 37.5, 127),
      photo('b1', '03', 13.7, 100.5),
      photo('b2', '04', 13.7, 100.5),
      photo('h3', '08', 37.5, 127),
      photo('h4', '09', 37.5, 127),
      photo('d1', '12', 16, 108),
    ];
    const findPlace = (lat) => ({
      city: lat < 15 ? '방콕' : lat < 20 ? '다낭' : '서울',
      country: '',
      cc: '',
    });
    const refresh = async () => {
      const journey = await buildJourney(photos, corrections.corrections, findPlace);
      vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready' });
    };
    const open = async (entry, page) => {
      await act(async () =>
        root.render(
          <MemoryRouter key={entry} initialEntries={[entry]}>
            {page}
          </MemoryRouter>,
        ),
      );
    };
    const checkViews = async (mapId, mapName, names) => {
      await open('/places', <PlacesPage />);
      const tabs = [...container.querySelectorAll('nav[aria-label="여행 고르기"] button')];
      expect(tabs).toHaveLength(names.length);
      names.forEach((name, i) => expect(tabs[i].textContent).toContain(name));
      await open('/map?trip=' + mapId, <MapPage />);
      expect(container.querySelector('header p').textContent).toBe(mapName);
    };
    corrections.add.mockImplementation(async (input) => {
      corrections.corrections = [{ id: 'saved', ...input }];
      await refresh();
    });
    corrections.removeMany
      .mockRejectedValueOnce(new Error('삭제 실패'))
      .mockImplementation(async (ids) => {
        corrections.corrections = corrections.corrections.filter((c) => !ids.includes(c.id));
        await refresh();
      });
    vi.mocked(useMyPhotos).mockReturnValue({ photos, status: 'ready' });
    await refresh();
    // when: 뒤쪽 여행부터 골라 저장
    await open('/edit/photos', <PhotoSortPage />);
    await click(checkboxes()[1]);
    await click(checkboxes()[0]);
    await click(buttonByText('합치기'));
    // then: 07, 03, 01에 같은 여행
    expect(corrections.add).toHaveBeenCalledExactlyOnceWith({
      type: 'merge',
      photoIds: ['b2', 'd1'],
    });
    await open('/edit/photos', <PhotoSortPage />);
    expect(tripNames()).toEqual(['방콕 · 다낭']);
    await checkViews('b1', '방콕 · 다낭', ['방콕 · 다낭']);

    // when: 첫 삭제는 실패하고 재시도에 성공
    await open('/edit/photos', <PhotoSortPage />);
    await click(buttonByText('합치기 취소'));
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      '합치기를 취소하지 못했어요',
    );
    await click(buttonByText('합치기 취소'));
    // then
    expect(corrections.removeMany.mock.calls).toEqual([[['saved']], [['saved']]]);
    await open('/edit/photos', <PhotoSortPage />);
    expect(tripNames()).toEqual(['방콕', '다낭']);
    await checkViews('d1', '다낭', ['방콕', '다낭']);
    await open('/map?trip=b1', <MapPage />);
    expect(container.querySelector('header p').textContent).toBe('방콕');
  });
});

describe('07a 여행 보정 요청이 겹칠 때', () => {
  const boxes = () => [...container.querySelectorAll('input[type="checkbox"]')];
  const photoIds = (trip) =>
    trip.stopIds.flatMap((id) => seojin.stops.find((s) => s.id === id).photoIds);
  beforeEach(async () => {
    // 실제 스토어와 훅을 연결하고 서버 응답 시점만 테스트에서 정해요.
    const actual = await vi.importActual('@/hooks/useCorrections');
    vi.mocked(useCorrections).mockImplementation(actual.useCorrections);
    useAuthStore.setState({ user: { id: 'merge-test' } });
    useCorrectionStore.setState({ status: 'ready', corrections: [] });
    onTestFinished(() => {
      useCorrectionStore.getState().reset();
      useAuthStore.setState({ user: null });
      localStorage.removeItem('danyeo-on:journey-stale:merge-test');
    });
  });

  test('저장 응답 전에 탭을 왕복해도 같은 두 여행을 다시 보낼 수 없어요', async () => {
    // given
    const saving = Promise.withResolvers();
    vi.mocked(addCorrection).mockImplementation(async (fields) => {
      await saving.promise;
      return fields.id;
    });
    await render('/edit/photos');
    await click(boxes()[0]);
    await click(boxes()[1]);
    await click(buttonByText('합치기'));
    // when
    await click(tabs().find((t) => t.textContent.includes('위치 확인 필요')));
    await click(tabs().find((t) => t.textContent.includes('여행 묶음')));
    // then
    expect(boxes().every((box) => box.disabled)).toBe(true);
    await click(boxes()[0]);
    await click(boxes()[1]);
    await click(buttonByText('합치기'));
    expect(addCorrection).toHaveBeenCalledTimes(1);
    await act(async () => saving.resolve());
  });

  test('A+B 취소 중에는 이전 줄에서 B+C를 저장할 수 없고 최신 여행을 읽은 뒤에만 다시 선택해요', async () => {
    // given
    const [a, b] = seojin.trips;
    const joined = { ...a, to: b.to, stopIds: [...a.stopIds, ...b.stopIds] };
    const journey = { ...seojin, trips: [joined, ...seojin.trips.slice(2)] };
    vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready' });
    useCorrectionStore.setState({
      corrections: [{ id: 'm', type: 'merge', photoIds: [photoIds(a).at(-1), photoIds(b)[0]] }],
    });
    const removing = Promise.withResolvers();
    const rebuilding = Promise.withResolvers();
    vi.mocked(removeCorrection).mockReturnValue(removing.promise);
    vi.mocked(refreshJourney).mockReturnValue(rebuilding.promise);
    await render('/edit/photos');
    await click(boxes()[0]);
    await click(boxes()[1]);
    expect(buttonByText('합치기').disabled).toBe(false);
    // when
    await click(buttonByText('합치기 취소'));
    // then
    expect(buttonByText('합치기').disabled).toBe(true);
    await click(buttonByText('합치기'));
    expect(addCorrection).not.toHaveBeenCalled();
    await act(async () => removing.resolve(true));
    expect(boxes().every((box) => box.disabled)).toBe(true);
    vi.mocked(useJourney).mockReturnValue({ journey, status: 'ready', isRefreshing: true });
    await act(async () => rebuilding.resolve());
    expect(boxes().every((box) => box.disabled)).toBe(true);
    vi.mocked(useJourney).mockReturnValue({
      journey: seojin,
      status: 'ready',
      isRefreshing: false,
    });
    await render('/edit/photos');
    expect(buttonByText('합치기').disabled).toBe(true);
    expect(boxes()[0].disabled).toBe(false);
  });
});

describe('07 사진 모두 삭제', () => {
  // 스토어의 reset에 건 spy가 다른 테스트로 새지 않게 되돌려요.
  afterEach(() => vi.restoreAllMocks());

  test('확인하면 내 것을 모두 지우고, 보정 · 글 · 올리기 스토어를 비운 뒤 13 올리기로 가요', async () => {
    // given
    useAuthStore.setState({ user: { id: 'delete-all-test' } });
    onTestFinished(() => useAuthStore.setState({ user: null }));
    const resets = [
      vi.spyOn(useCorrectionStore.getState(), 'reset'),
      vi.spyOn(usePostStore.getState(), 'reset'),
      vi.spyOn(useUploadStore.getState(), 'reset'),
    ];
    vi.mocked(deleteAllMyData).mockResolvedValue();
    await render('/edit/photos');
    await click(buttonByText('사진 모두 삭제'));

    // when
    await click(dialogButton('모두 삭제'));

    // then
    expect(deleteAllMyData).toHaveBeenCalledExactlyOnceWith('delete-all-test');
    resets.forEach((reset) => expect(reset).toHaveBeenCalledOnce());
    expect(location).toBe('/upload');
  });

  test('지우지 못하면 07에 남아 안내하고, 앞 단계에서 지웠을 수 있는 보정 · 글은 다시 읽게 비워요', async () => {
    // given
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const resetCorrections = vi.spyOn(useCorrectionStore.getState(), 'reset');
    const resetPosts = vi.spyOn(usePostStore.getState(), 'reset');
    const resetUpload = vi.spyOn(useUploadStore.getState(), 'reset');
    vi.mocked(deleteAllMyData).mockRejectedValue(new Error('corrections 실패'));
    await render('/edit/photos');
    await click(buttonByText('사진 모두 삭제'));

    // when
    await click(dialogButton('모두 삭제'));

    // then
    expect(location).toBe('/edit/photos');
    expect(container.textContent).toContain('사진을 모두 지우지 못했어요. 다시 눌러 주세요');
    expect(resetCorrections).toHaveBeenCalledOnce();
    expect(resetPosts).toHaveBeenCalledOnce();
    expect(resetUpload).not.toHaveBeenCalled();
  });

  test('지우는 동안 07의 다른 편집을 막아요', async () => {
    // given
    let finish;
    vi.mocked(deleteAllMyData).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render('/edit/photos');
    await click(buttonByText('사진 모두 삭제'));

    // when
    await click(dialogButton('모두 삭제'));

    // then
    expect(buttonByText('삭제하는 중…').disabled).toBe(true);
    expect(renameButton('방콕 · 다낭').disabled).toBe(true);

    await act(async () => finish());
  });

  test('지우는 동안 제외한 사진의 [복구] · [영구 삭제]를 막아요', async () => {
    // given
    mockCorrections({
      corrections: [{ id: 'c_1', type: 'exclude', photoId: bangkokPhotoIds[0] }],
    });
    let finish;
    vi.mocked(deleteAllMyData).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render('/edit/photos?tab=excluded');
    await click(buttonByText('사진 모두 삭제'));

    // when
    await click(dialogButton('모두 삭제'));

    // then
    expect(buttonByText('복구').disabled).toBe(true);
    expect(buttonByText('영구 삭제').disabled).toBe(true);

    await act(async () => finish());
  });

  test('지우는 동안 Journey 계산 [다시 시도]를 막아요', async () => {
    // given
    mockCorrections({ journeyStatus: 'failed' });
    let finish;
    vi.mocked(deleteAllMyData).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render('/edit/photos');
    await click(buttonByText('사진 모두 삭제'));

    // when
    await click(dialogButton('모두 삭제'));

    // then
    expect(buttonByText('다시 시도').disabled).toBe(true);

    await act(async () => finish());
  });

  test('보정을 저장하는 중이면 [사진 모두 삭제]를 막아요', async () => {
    // given
    mockCorrections({ hasPending: true });

    // when
    await render('/edit/photos');

    // then
    expect(buttonByText('사진 모두 삭제').disabled).toBe(true);
  });

  test('13에서 이미지를 올리는 중이면 [사진 모두 삭제]를 막아요', async () => {
    // given
    useUploadStore.setState({ imageUpload: { total: 10, uploaded: 3, skipped: 0, failed: 0 } });
    onTestFinished(() => useUploadStore.getState().reset());

    // when
    await render('/edit/photos');

    // then
    expect(buttonByText('사진 모두 삭제').disabled).toBe(true);
  });

  test('Journey를 계산하는 중이면 [사진 모두 삭제]를 막아요', async () => {
    // given
    mockCorrections({ journeyStatus: 'building' });

    // when
    await render('/edit/photos');

    // then
    expect(buttonByText('사진 모두 삭제').disabled).toBe(true);
  });
});
