import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import App from '@/App';
import SavePhotos from '@/pages/UploadPage/pass/SavePhotos';
import UploadPage from '@/pages/UploadPage/UploadPage';
import * as authService from '@/services/authService';
import { refreshJourney } from '@/services/journeyService';
import { savePhotoImage, savePhotos } from '@/services/photoService';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { readPhotos } from '@/utils/upload/readPhotos';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn(), resizeFull: vi.fn() }));
vi.mock('@/utils/upload/readPhotos', () => ({ readPhotos: vi.fn() }));
// App이 쓰는 getJourney는 그대로 두고, 저장 뒤 만드는 Journey만 가짜로 바꿔요.
vi.mock('@/services/journeyService', async (importOriginal) => ({
  ...(await importOriginal()),
  refreshJourney: vi.fn(),
}));
vi.mock('@/services/photoService', () => ({
  savePhotoImage: vi.fn(),
  savePhotos: vi.fn(),
  getPhotoImageUrl: vi.fn(),
  getMyData: vi.fn(),
  getUploadedImagePaths: vi.fn(),
}));
vi.mock('@/services/authService', () => ({
  getSessionUser: vi.fn(),
  onSessionChange: vi.fn(() => () => {}),
}));

const user = { id: '내계정', email: 'seojin@demo.local', name: '서진' };
const file = new File(['원본'], '사진.jpg', { type: 'image/jpeg' });
// 이름에 번호가 있어 정리 화면에서 묻지 않고 지나가는 사진이에요. file은 번호가 없어서 끝에서 물어요.
const numbered = new File(['원본'], 'IMG_0001.jpg', { type: 'image/jpeg' });
// 사진 줄은 한 장에 300ms쯤 머물다 저절로 지나가서, 다 지나갈 때까지 넉넉히 기다려요.
const PASS_TIMEOUT = { timeout: 3000 };
// refreshJourney가 돌려주는 Journey예요. 여행이 없어서 [여행 보기]는 탭을 고르지 않고 넘어가요.
const EMPTY_JOURNEY = { stops: [], trips: [] };
let container;
let root;

// flatMap
const readPhotoOf = (order, fileName) => ({
  order,
  fileName,
  takenAt: null,
  offset: null,
  timeUncertain: true,
  lat: null,
  lng: null,
  camera: null,
  dedupeKey: `|${fileName}`,
});
const findButton = (text) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

/** /places 자리예요. 어느 여행 탭으로 넘어왔는지 보이게 주소의 ?trip=도 붙여 보여 줘요. */
function PlacesStub() {
  const { search } = useLocation();
  return <p>전체 기록{search}</p>;
}

/** /edit/photos 자리예요. 어느 탭으로 넘어왔는지 보이게 주소의 ?tab=도 붙여 보여 줘요. */
function PhotoSortStub() {
  const { search } = useLocation();
  return <p>사진 정리{search}</p>;
}

/**
 * 로그인해서 사진을 다 모으고, [다음]을 눌러 정리 화면으로 넘어가요.
 * 다 저장하면 넘어가는 /places · /edit/photos 자리에는 PlacesStub · PhotoSortStub을 둬요.
 */
async function openPass(files) {
  useAuthStore.setState({ user, status: 'authenticated' });
  await useUploadStore.getState().start(files);
  vi.mocked(readPhotos).mockResolvedValue({
    photos: files.map((picked, order) => readPhotoOf(order, picked.name)),
    skipped: [],
  });
  await act(() =>
    root.render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/places" element={<PlacesStub />} />
          <Route path="/edit/photos" element={<PhotoSortStub />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
  await act(() => findButton('다음').click());
}

/**
 * 파일을 화면에 끌어다 놓은 것처럼 window에 drop을 보내요.
 * 파일 항목만 흉내 내서 filesFromEntries가 file()로 그대로 꺼내요.
 */
function dropFiles(files) {
  const event = new Event('drop', { cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: ['Files'],
      items: files.map((dropped) => ({
        webkitGetAsEntry: () => ({ isFile: true, file: (resolve) => resolve(dropped) }),
      })),
    },
  });
  window.dispatchEvent(event);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  useUploadStore.getState().reset();
  useAuthStore.getState().reset();
  vi.mocked(resizeThumbnail).mockResolvedValue(new Blob(['썸네일'], { type: 'image/webp' }));
  vi.mocked(authService.getSessionUser).mockResolvedValue(user);
  vi.mocked(refreshJourney).mockResolvedValue(EMPTY_JOURNEY);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  useUploadStore.getState().reset();
  useAuthStore.getState().reset();
  usePostStore.getState().reset();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test('StrictMode에서 사진을 골라도 한 번만 줄여요', async () => {
  // given: StrictMode에서 사진 올리기 화면을 엶
  await act(() =>
    root.render(
      <StrictMode>
        <UploadPage />
      </StrictMode>,
    ),
  );
  const input = container.querySelector('input[accept]');
  Object.defineProperty(input, 'files', { value: [file] });

  // when: 사진을 고르면
  await act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

  // then
  expect(container.textContent).toContain('사진을 다 모았어요');
  expect(resizeThumbnail).toHaveBeenCalledExactlyOnceWith(file);
});

test('다시 고르기를 누르면 고르기 화면으로 돌아가고 주소를 해제해요', async () => {
  // given: 사진을 다 모은 화면
  await useUploadStore.getState().start([file]);
  const src = useUploadStore.getState().photos[0].src;
  await act(() => root.render(<UploadPage />));
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  const resetButton = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === '다시 고르기',
  );

  // when
  await act(() => resetButton.click());

  // then
  expect(container.textContent).toContain('폴더 고르기');
  expect(useUploadStore.getState().files).toEqual([]);
  expect(revoke).toHaveBeenCalledWith(src);
});

test('화면이 사라졌다 돌아와도 같은 썸네일을 써요', async () => {
  // given: 사진을 다 모은 화면이 사라짐
  await useUploadStore.getState().start([file]);
  const photo = useUploadStore.getState().photos[0];
  await act(() => root.render(<UploadPage />));
  await act(() => root.render(null));

  // when: 다시 돌아오면
  await act(() => root.render(<UploadPage />));

  // then: 다시 줄이지 않고, 살아 있는 같은 주소를 씀
  expect(container.textContent).toContain('사진을 다 모았어요');
  expect(container.querySelector('img').src).toBe(photo.src);
  expect(await (await fetch(photo.src)).text()).toBe('썸네일');
  expect(resizeThumbnail).toHaveBeenCalledTimes(1);
});

test('화면이 사라졌다 돌아와도 뺀 파일 안내가 남아요', async () => {
  // given: 일부를 빼고 다 모은 화면이 사라짐
  await useUploadStore.getState().start([file], [{ fileName: '메모.txt', reason: 'unsupported' }]);
  await act(() => root.render(<UploadPage />));
  await act(() => root.render(null));

  // when: 다시 돌아오면
  await act(() => root.render(<UploadPage />));

  // then: 사진과 함께 안내도 그대로 보임
  expect(container.textContent).toContain('사진을 다 모았어요');
  expect(container.textContent).toContain('받지 않는 형식 1개는 뺐어요');
});

test.each([null, { ...user, id: '다른계정' }])(
  '세션 주인이 바뀌면 사진을 정리해요: %j',
  async (nextUser) => {
    // given: 로그인한 상태에서 사진을 모음
    await act(() =>
      root.render(
        <StrictMode>
          <MemoryRouter initialEntries={['/upload']}>
            <App />
          </MemoryRouter>
        </StrictMode>,
      ),
    );
    await act(() => useUploadStore.getState().start([file]));
    const src = useUploadStore.getState().photos[0].src;
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    usePostStore.setState({ status: 'ready' });

    // when: 로그아웃하거나 다른 계정이 되면
    await act(() =>
      useAuthStore.setState({ user: nextUser, status: nextUser ? 'authenticated' : 'anonymous' }),
    );

    // then
    expect(useUploadStore.getState().photos).toEqual([]);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
    expect(usePostStore.getState().status).toBe('idle');
  },
);

test('같은 계정의 세션 갱신에서는 사진을 유지해요', async () => {
  // given: 로그인한 상태에서 사진을 모음
  await act(() =>
    root.render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    ),
  );
  await act(() => useUploadStore.getState().start([file]));
  const photo = useUploadStore.getState().photos[0];

  // when: 같은 계정의 새 user 객체가 들어오면
  await act(() => useAuthStore.setState({ user: { ...user } }));

  // then
  expect(useUploadStore.getState().photos[0]).toBe(photo);
});

test('빼 둔 사진을 뺀 나머지를 저장하고, 다 올리면 전체 기록으로 넘어가요', async () => {
  // given: 자리를 못 찾은 '사진.jpg'는 끝에서 물어보면 빼 둠
  await openPass([numbered, file]);
  vi.mocked(savePhotos).mockImplementation(async (photos) => ({
    saved: photos.map((photo) => photo.id),
    skipped: [],
  }));
  vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
  vi.mocked(savePhotoImage).mockResolvedValue();
  await vi.waitFor(() => expect(findButton('빼 두기')).toBeDefined(), PASS_TIMEOUT);
  await act(() => findButton('빼 두기').click());

  // when
  await act(() => findButton('여행 보기').click());
  await vi.waitFor(() => expect(container.textContent).toBe('전체 기록'));

  // then
  const [[rows]] = vi.mocked(savePhotos).mock.calls;
  expect(rows.map((row) => row.fileName)).toEqual(['IMG_0001.jpg']);
  expect(savePhotoImage).toHaveBeenCalledExactlyOnceWith(
    expect.stringMatching(/^photos:내계정\/p_[0-9a-f]{12}$/),
    expect.anything(),
  );
});

test('이미지를 다 올리기 전에는 넘어가지 않고 올리는 진행을 보여 줘요', async () => {
  // given: 이미지 올리기가 끝나지 않음
  await openPass([numbered]);
  vi.mocked(savePhotos).mockImplementation(async (photos) => ({
    saved: photos.map((photo) => photo.id),
    skipped: [],
  }));
  vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
  const uploading = Promise.withResolvers();
  vi.mocked(savePhotoImage).mockReturnValue(uploading.promise);
  await vi.waitFor(() => expect(findButton('여행 보기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('여행 보기').click());
  await vi.waitFor(() => expect(container.textContent).toContain('이미지 올리는 중 0 / 1'));

  // then: 올리기가 끝나야 넘어감
  expect(container.textContent).toContain('1장 저장했어요');
  await act(() => uploading.resolve());
  await vi.waitFor(() => expect(container.textContent).toBe('전체 기록'));
});

test('저장하지 못하면 안내와 다시 시도를 보여 줘요', async () => {
  // given
  await openPass([numbered]);
  vi.mocked(savePhotos).mockRejectedValue(new Error('네트워크'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await vi.waitFor(() => expect(findButton('여행 보기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('여행 보기').click());

  // then
  await vi.waitFor(() => expect(findButton('다시 시도')).toBeDefined());
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    '저장하지 못했어요. 다시 시도해 주세요',
  );
});

/** 사진 한 장을 저장하고 이미지도 바로 올라가게 해 둬요. */
function savesAndUploads() {
  vi.mocked(savePhotos).mockImplementation(async (photos) => ({
    saved: photos.map((photo) => photo.id),
    skipped: [],
  }));
  vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
  vi.mocked(savePhotoImage).mockResolvedValue();
}

test('이미지를 다 올려도 여행을 정리하는 동안에는 넘어가지 않아요', async () => {
  // given: Journey 만들기가 끝나지 않음
  await openPass([numbered]);
  savesAndUploads();
  const building = Promise.withResolvers();
  vi.mocked(refreshJourney).mockReturnValue(building.promise);
  await vi.waitFor(() => expect(findButton('여행 보기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('여행 보기').click());
  await vi.waitFor(() => expect(container.textContent).toContain('이미지를 다 올렸어요'));

  // then: Journey를 다 쓰면 넘어감
  expect(container.textContent).toContain('여행을 정리하는 중…');
  expect(refreshJourney).toHaveBeenCalledExactlyOnceWith(user.id);
  await act(() => building.resolve(EMPTY_JOURNEY));
  await vi.waitFor(() => expect(container.textContent).toBe('전체 기록'));
});

test('새로 저장한 사진이 든 여행 탭으로 넘어가요', async () => {
  // given: Journey에 이번에 저장한 사진이 든 여행이 있음
  await openPass([numbered]);
  savesAndUploads();
  vi.mocked(refreshJourney).mockImplementation(async () => {
    const [[rows]] = vi.mocked(savePhotos).mock.calls;
    return {
      stops: [{ id: 'tokyo', photoIds: [rows[0].id] }],
      trips: [{ id: 'japan', stopIds: ['tokyo'] }],
    };
  });
  await vi.waitFor(() => expect(findButton('여행 보기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('여행 보기').click());

  // then
  await vi.waitFor(() => expect(container.textContent).toBe('전체 기록?trip=japan'));
});

test('여행을 만들지 못하면 안내를 보여 주고, 다시 시도하면 Journey만 다시 만들어요', async () => {
  // given
  await openPass([numbered]);
  savesAndUploads();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(refreshJourney)
    .mockRejectedValueOnce({ status: 0, code: 'SAVE_FAILED', message: '0행' })
    .mockResolvedValueOnce(EMPTY_JOURNEY);
  await vi.waitFor(() => expect(findButton('여행 보기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('여행 보기').click());
  await vi.waitFor(() => expect(findButton('다시 시도')).toBeDefined());

  // then
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    '여행을 만들지 못했어요. 사진은 저장돼 있어요',
  );
  await act(() => findButton('다시 시도').click());
  await vi.waitFor(() => expect(container.textContent).toBe('전체 기록'));
  expect(savePhotos).toHaveBeenCalledOnce();
  expect(refreshJourney).toHaveBeenCalledTimes(2);
});

test('[사진 정리하기]도 저장하고, 다 끝나면 07 위치 확인 필요 탭으로 넘어가요', async () => {
  // given
  await openPass([numbered]);
  savesAndUploads();
  await vi.waitFor(() => expect(findButton('사진 정리하기')).toBeDefined(), PASS_TIMEOUT);

  // when
  await act(() => findButton('사진 정리하기').click());

  // then
  await vi.waitFor(() => expect(container.textContent).toBe('사진 정리?tab=unlocated'));
  expect(savePhotos).toHaveBeenCalledOnce();
});

test('[사진 정리하기]로 저장한 뒤 화면이 새로 그려져도 07로 넘어가요', async () => {
  // given: [사진 정리하기]로 저장한 채 페이지를 나갔다가, 다 끝난 뒤 저장 화면이 다시 그려짐
  useAuthStore.setState({ user, status: 'authenticated' });
  useUploadStore.setState({
    saveStatus: 'saved',
    saveTarget: 'sort',
    saveResult: { saved: 1, existing: 0 },
    imageUpload: { total: 1, uploaded: 1, skipped: 0, failed: 0 },
    journeyStatus: 'saved',
    newTripId: 'japan',
  });

  // when
  await act(() =>
    root.render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/upload" element={<SavePhotos />} />
          <Route path="/places" element={<PlacesStub />} />
          <Route path="/edit/photos" element={<PhotoSortStub />} />
        </Routes>
      </MemoryRouter>,
    ),
  );

  // then
  expect(container.textContent).toBe('사진 정리?tab=unlocated');
});

test('사진이 하나도 없으면 넘어가지 않고 사진이 없다고 알려요', async () => {
  // given
  await act(() => root.render(<UploadPage />));
  const input = container.querySelector('input[accept]');
  Object.defineProperty(input, 'files', {
    value: [new File([], '.DS_Store'), new File([], '메모.txt')],
  });

  // when: 사진이 아닌 파일만 고르면
  await act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

  // then
  expect(container.querySelector('[role="alert"]').textContent).toBe(
    '고른 곳에 사진이 없어요 · 숨김 파일 1개 · 받지 않는 형식 1개',
  );
  expect(container.textContent).toContain('폴더 고르기');
  expect(resizeThumbnail).not.toHaveBeenCalled();
});

test('사진 없이 끌어다 놓아도 넘어가지 않고 사진이 없다고 알려요', async () => {
  // given
  await act(() => root.render(<UploadPage />));

  // when: 사진이 아닌 파일만 끌어다 놓으면
  await act(async () => dropFiles([new File([], '메모.txt')]));

  // then
  await vi.waitFor(() =>
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      '고른 곳에 사진이 없어요 · 받지 않는 형식 1개',
    ),
  );
  expect(container.textContent).toContain('폴더 고르기');
  expect(resizeThumbnail).not.toHaveBeenCalled();
});

test('빈 폴더를 끌어다 놓으면 뺀 이유 없이 사진이 없다고만 알려요', async () => {
  // given
  await act(() => root.render(<UploadPage />));

  // when: 안에 파일이 하나도 없는 것을 끌어다 놓으면
  await act(async () => dropFiles([]));

  // then: 뺀 파일이 없으니 " · 숨김 파일 …" 같은 이유를 붙이지 않음
  await vi.waitFor(() =>
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('고른 곳에 사진이 없어요'),
  );
  expect(container.textContent).toContain('폴더 고르기');
});

test('일부를 뺐으면 모으기 화면에서 몇 개를 왜 뺐는지 알려요', async () => {
  // given
  await act(() => root.render(<UploadPage />));
  const input = container.querySelector('input[accept]');
  Object.defineProperty(input, 'files', { value: [file, new File([], '메모.txt')] });

  // when
  await act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

  // then
  expect(container.textContent).toContain('사진을 다 모았어요');
  expect(container.textContent).toContain('받지 않는 형식 1개는 뺐어요');
});
