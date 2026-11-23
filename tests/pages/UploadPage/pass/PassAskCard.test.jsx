import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import PassAskCard from '@/pages/UploadPage/pass/PassAskCard';
import '@/styles/global.css';

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

const renderCard = (photo, onAnswer = () => {}) =>
  act(() => root.render(<PassAskCard photo={photo} step={1} total={1} onAnswer={onAnswer} />));

const buttonLabels = () =>
  [...container.querySelectorAll('button')].map((button) => button.textContent);

test('촬영 시각만 없는 사진은 그 이유로 묻고 두 답을 받아요', async () => {
  // given
  const photo = {
    id: 'NOEXIF_0001.jpg',
    filename: 'NOEXIF_0001.jpg',
    readable: true,
    takenAt: null,
  };

  // when
  await renderCard(photo);

  // then
  expect(container.textContent).toContain('촬영 시각이 없어서 자리를 못 찾았어요.');
  expect(buttonLabels()).toEqual(['빼 두기', '나중에']);
});

test('열리지 않는 파일은 그 이유로 알리고 빼 두기만 받아요', async () => {
  // given
  const photo = { id: 'FAKE_0001.jpg', filename: 'FAKE_0001.jpg', readable: false, takenAt: null };
  const onAnswer = vi.fn();
  await renderCard(photo, onAnswer);

  // when
  await act(() => container.querySelector('button').click());

  // then
  expect(container.textContent).toContain('열리지 않는 파일이라 기록에 넣을 수 없어요.');
  expect(container.textContent).not.toContain('촬영 시각이 없어서');
  expect(buttonLabels()).toEqual(['빼 두기']);
  expect(onAnswer).toHaveBeenCalledWith('exclude');
});
