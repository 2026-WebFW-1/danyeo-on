import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import App from '@/App';
import UploadPage from '@/pages/UploadPage/UploadPage';
import * as authService from '@/services/authService';
import { savePhotoImage, savePhotos } from '@/services/photoService';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { readPhotos } from '@/utils/upload/readPhotos';
import { resizeFull, resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn(), resizeFull: vi.fn() }));
vi.mock('@/utils/upload/readPhotos', () => ({ readPhotos: vi.fn() }));
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

/**
 * 로그인해서 사진을 다 모으고, [다음]을 눌러 정리 화면으로 넘어가요.
 * 다 저장하면 넘어가는 /places 자리에는 글자 하나만 둬요.
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
          <Route path="/places" element={<p>전체 기록</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
  await act(() => findButton('다음').click());
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  useUploadStore.getState().reset();
  useAuthStore.getState().reset();
  vi.mocked(resizeThumbnail).mockResolvedValue(new Blob(['썸네일'], { type: 'image/webp' }));
  vi.mocked(authService.getSessionUser).mockResolvedValue(user);
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
