import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
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
}));
vi.mock('@/services/authService', () => ({
  getSessionUser: vi.fn(),
  onSessionChange: vi.fn(() => () => {}),
}));

const user = { id: '내계정', email: 'seojin@demo.local', name: '서진' };
const file = new File(['원본'], '사진.jpg', { type: 'image/jpeg' });
let container;
let root;

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

test('다 모은 뒤 저장하기를 누르면 저장하고 올린 이미지 수를 보여 줘요', async () => {
  // given: 로그인해서 사진을 다 모은 화면
  useAuthStore.setState({ user, status: 'authenticated' });
  await useUploadStore.getState().start([file]);
  vi.mocked(readPhotos).mockResolvedValue({
    photos: [
      {
        order: 0,
        fileName: '사진.jpg',
        takenAt: null,
        offset: null,
        timeUncertain: true,
        lat: null,
        lng: null,
        camera: null,
        dedupeKey: '|사진.jpg',
      },
    ],
    skipped: [],
    counts: { unreadable: 0, noDate: 1, noLocation: 1 },
  });
  vi.mocked(savePhotos).mockImplementation(async (photos) => ({
    saved: photos.map((photo) => photo.id),
    skipped: [],
  }));
  vi.mocked(resizeFull).mockResolvedValue(new Blob(['보기용'], { type: 'image/webp' }));
  vi.mocked(savePhotoImage).mockResolvedValue();
  await act(() => root.render(<UploadPage />));
  const saveButton = [...container.querySelectorAll('button')].find(
    (button) => button.textContent === '저장하기',
  );

  // when
  await act(() => saveButton.click());
  await vi.waitFor(() => expect(container.textContent).toContain('이미지를 다 올렸어요'));

  // then
  expect(container.textContent).toContain('1장 저장했어요');
  expect(savePhotoImage).toHaveBeenCalledWith(
    expect.stringMatching(/^photos:내계정\/p_[0-9a-f]{12}$/),
    expect.anything(),
  );
});
