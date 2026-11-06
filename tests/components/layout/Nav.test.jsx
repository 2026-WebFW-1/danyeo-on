import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import Nav from '@/components/layout/Nav';

let container;
let root;

const render = (path) =>
  act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Nav />
      </MemoryRouter>,
    ),
  );

const link = (label) =>
  [...container.querySelectorAll('nav a')].find((a) => a.textContent === label);
const whiteLabels = () =>
  [...container.querySelectorAll('nav a')]
    .filter((a) => a.className.includes('text-white'))
    .map((a) => a.textContent);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Nav 지금 메뉴', () => {
  test.each([
    ['/', ['Home']],
    ['/map', ['Map']],
    ['/places', ['Places']],
    ['/places/some', ['Places']],
    ['/passport', ['Passport']],
  ])('%s에서는 %j만 흰색이에요', async (path, expected) => {
    await render(path);

    expect(whiteLabels()).toEqual(expected);
  });

  test('02 챕터(/chapter/…)에서도 Places가 흰색이에요(03에서 열리는 화면이에요)', async () => {
    await render('/chapter/밴쿠버-2025');

    expect(whiteLabels()).toEqual(['Places']);
  });

  test('/chapter 바로 그 주소에서도 Places가 흰색이에요', async () => {
    await render('/chapter');

    expect(whiteLabels()).toEqual(['Places']);
  });

  test('앞부분만 같은 주소(/chapters)는 아니에요', async () => {
    await render('/chapters');

    expect(whiteLabels()).toEqual([]);
  });

  test('메뉴에 없는 주소(/upload)에서는 어느 메뉴도 흰색이 아니에요', async () => {
    await render('/upload');

    expect(whiteLabels()).toEqual([]);
  });

  test('02 챕터에서는 Places에 aria-current를 붙이지 않아요(03이 열려 있는 게 아니에요)', async () => {
    await render('/chapter/밴쿠버-2025');

    expect(link('Places').getAttribute('aria-current')).toBeNull();
  });

  test('03 전체 기록에서는 Places에 aria-current="page"가 붙어요', async () => {
    await render('/places');

    expect(link('Places').getAttribute('aria-current')).toBe('page');
  });

  test('02 챕터에서 Places를 누르면 03 전체 기록 주소를 가리켜요', async () => {
    await render('/chapter/밴쿠버-2025');

    expect(link('Places').getAttribute('href')).toBe('/places');
  });
});
