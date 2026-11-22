import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';

import PassTimeline from '@/pages/UploadPage/pass/PassTimeline';
import { useUploadStore } from '@/stores/upload/uploadStore';

let container;
let root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useUploadStore.setState({ photos: [] });
});

test('사진이 한 장이면 그 한 장이 마지막 장이라 100%예요', async () => {
  // given
  useUploadStore.setState({ photos: [{ id: '0-IMG_0001.jpg', order: 0 }] });

  // when
  await act(() => root.render(<PassTimeline currentIndex={0} moveMs={0} />));

  // then
  const progress = container.querySelector('[role="progressbar"]');
  expect(progress.getAttribute('aria-valuenow')).toBe('100');
});
