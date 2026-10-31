import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import App from '@/App';
import UploadPage from '@/pages/UploadPage/UploadPage';
import * as authService from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useUploadStore } from '@/stores/upload/uploadStore';
import { resizeThumbnail } from '@/utils/upload/resizePhoto';

vi.mock('@/utils/upload/resizePhoto', () => ({ resizeThumbnail: vi.fn() }));
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

    // when: 로그아웃하거나 다른 계정이 되면
    await act(() =>
      useAuthStore.setState({ user: nextUser, status: nextUser ? 'authenticated' : 'anonymous' }),
    );

    // then
    expect(useUploadStore.getState().photos).toEqual([]);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
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
