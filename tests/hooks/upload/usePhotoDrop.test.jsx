import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { usePhotoDrop } from '@/hooks/upload/usePhotoDrop';
import { filesFromEntries } from '@/utils/upload/photoFiles';

vi.mock('@/utils/upload/photoFiles', async (importOriginal) => ({
  ...(await importOriginal()),
  filesFromEntries: vi.fn(),
}));

const photo = new File(['사진'], '사진.jpg', { type: 'image/jpeg' });
let container;
let root;
let traversal;

function DropZone({ onPick }) {
  usePhotoDrop(onPick);
  return null;
}

// 폴더를 놓은 것처럼 drop을 보냅니다. 폴더 훑기는 traversal.resolve 전까지 끝나지 않아요.
function dropFolder() {
  const event = new Event('drop', { cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], items: [{ webkitGetAsEntry: () => ({ isDirectory: true }) }] },
  });
  window.dispatchEvent(event);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  traversal = Promise.withResolvers();
  vi.mocked(filesFromEntries).mockReturnValue(traversal.promise);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

test('화면이 사라진 뒤 끝난 폴더 훑기는 넘기지 않아요', async () => {
  // given: 폴더를 놓고 훑는 중에 화면이 사라짐
  const onPick = vi.fn();
  await act(() => root.render(<DropZone onPick={onPick} />));
  dropFolder();
  await act(() => root.render(null));

  // when: 훑기가 끝나면
  await act(async () => {
    traversal.resolve([photo]);
    await traversal.promise;
  });

  // then
  expect(onPick).not.toHaveBeenCalled();
});

test('훑는 도중 다시 그려져도 놓은 사진을 최신 onPick으로 넘겨요', async () => {
  // given: 폴더를 놓고 훑는 중에 새 onPick으로 다시 그려짐
  const previousPick = vi.fn();
  const currentPick = vi.fn();
  await act(() => root.render(<DropZone onPick={previousPick} />));
  dropFolder();
  await act(() => root.render(<DropZone onPick={currentPick} />));

  // when: 훑기가 끝나면
  await act(async () => {
    traversal.resolve([photo]);
    await traversal.promise;
  });

  // then
  expect(currentPick).toHaveBeenCalledExactlyOnceWith([photo]);
  expect(previousPick).not.toHaveBeenCalled();
});
