import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Nav from '@/components/layout/Nav';
import { useEscape } from '@/hooks/useEscape';
import { useAuthStore } from '@/stores/authStore';

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

describe('Nav [편집 모드]', () => {
  const editLink = () =>
    [...container.querySelectorAll('header a')].find((a) => a.textContent === '편집 모드');

  test('07 사진 정리 주소를 가리켜요', async () => {
    await render('/');

    expect(editLink().getAttribute('href')).toBe('/edit/photos');
    expect(editLink().className).not.toContain('text-white');
  });

  test('07에 있으면 흰색이고, 페이지 메뉴는 흰색이 아니에요', async () => {
    await render('/edit/photos?tab=unlocated');

    expect(editLink().className).toContain('text-white');
    expect(editLink().getAttribute('aria-current')).toBe('page');
    expect(whiteLabels()).toEqual([]);
  });
});

describe('Nav [메뉴]', () => {
  let signOut;

  /** 주소가 바뀌면 화면 글자가 바뀌어서, 메뉴 항목을 누른 뒤 다른 화면으로 갔는지 알 수 있어요. */
  const renderWithPages = (path = '/') =>
    act(async () =>
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Nav />
          <Routes>
            <Route path="*" element={<p data-testid="page">{path}</p>} />
            <Route path="/upload" element={<p data-testid="page">올리기 화면</p>} />
          </Routes>
        </MemoryRouter>,
      ),
    );
  const menuButton = () => container.querySelector('button[aria-controls]');
  const panel = () => document.getElementById(menuButton().getAttribute('aria-controls'));
  const panelItems = () =>
    [...(panel()?.querySelectorAll('li') ?? [])].map((item) => item.textContent);
  const panelControl = (text) =>
    [...(panel()?.querySelectorAll('a, button') ?? [])].find((item) => item.textContent === text);
  const click = (element) => act(async () => element.click());
  // 진짜 키 입력처럼 포커스된 요소에서 보내서 window까지 올라가게 해요.
  const pressEscape = () =>
    act(async () =>
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    );

  beforeEach(() => {
    signOut = vi.fn();
    useAuthStore.setState({ user: { id: 'u1', name: '윤서진' }, signOut });
  });

  afterEach(() => {
    useAuthStore.getState().reset();
  });

  test('처음엔 닫혀 있고, 바 위에는 이름과 [로그아웃]이 없어요', async () => {
    // when
    await renderWithPages();

    // then
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
    expect(container.textContent).not.toContain('로그아웃');
    expect(container.textContent).not.toContain('윤서진');
  });

  test('누르면 펼치고 이름 · 사진 올리기 · 사진 정리 · 로그아웃이 순서대로 보여요', async () => {
    // given
    await renderWithPages();

    // when
    await click(menuButton());

    // then
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(panelItems()).toEqual(['윤서진', '사진 올리기', '사진 정리', '로그아웃']);
  });

  test('사진 올리기와 사진 정리는 13 · 07 주소를 가리켜요', async () => {
    // given
    await renderWithPages();

    // when
    await click(menuButton());

    // then
    expect(panelControl('사진 올리기').getAttribute('href')).toBe('/upload');
    expect(panelControl('사진 정리').getAttribute('href')).toBe('/edit/photos');
  });

  test('다시 누르면 닫혀요', async () => {
    // given
    await renderWithPages();
    await click(menuButton());

    // when
    await click(menuButton());

    // then
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  test('Esc로 닫히고 포커스가 [메뉴]로 돌아가요', async () => {
    // given
    await renderWithPages();
    await click(menuButton());
    panelControl('사진 올리기').focus();

    // when
    await pressEscape();

    // then
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  test('바깥을 누르면 닫히고, 상자 안을 누르면 닫히지 않아요', async () => {
    // given
    await renderWithPages();
    await click(menuButton());

    // when
    await act(async () =>
      panel().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })),
    );

    // then
    expect(panel()).not.toBeNull();

    // when
    await act(async () =>
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })),
    );

    // then
    expect(panel()).toBeNull();
  });

  test('항목을 눌러 다른 화면으로 가면 닫혀요', async () => {
    // given
    await renderWithPages();
    await click(menuButton());

    // when
    await click(panelControl('사진 올리기'));

    // then
    expect(container.querySelector('[data-testid="page"]').textContent).toBe('올리기 화면');
    expect(panel()).toBeNull();
  });

  test('[로그아웃]을 누르면 signOut을 불러요', async () => {
    // given
    await renderWithPages();
    await click(menuButton());

    // when
    await click(panelControl('로그아웃'));

    // then
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  test('메뉴를 닫는 Esc는 뒤에 열린 다른 창(01 고치기 패널 등)을 닫지 않아요', async () => {
    // given
    const onOtherEscape = vi.fn();
    function OtherPanel() {
      useEscape(onOtherEscape);
      return null;
    }
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/map']}>
          <Nav />
          <OtherPanel />
        </MemoryRouter>,
      ),
    );
    await click(menuButton());

    // when
    await pressEscape();

    // then
    expect(panel()).toBeNull();
    expect(onOtherEscape).not.toHaveBeenCalled();

    // when: 메뉴가 닫힌 뒤의 Esc는 다른 창이 받아요
    await pressEscape();

    // then
    expect(onOtherEscape).toHaveBeenCalledTimes(1);
  });

  test('메뉴를 연 채 다른 화면에 갔다가 뒤로 돌아와도 닫혀 있어요', async () => {
    // given
    let navigate;
    function NavigateGrabber() {
      navigate = useNavigate();
      return null;
    }
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <Nav />
          <NavigateGrabber />
        </MemoryRouter>,
      ),
    );
    await click(menuButton());

    // when: 브라우저 뒤로·앞으로처럼 메뉴를 거치지 않고 주소가 바뀌어요
    await act(async () => navigate('/map'));
    await act(async () => navigate(-1));

    // then
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
  });

  test('이름이 없는 계정이면 이름 줄이 없어요', async () => {
    // given
    useAuthStore.setState({ user: { id: 'u1', name: '' } });
    await renderWithPages();

    // when
    await click(menuButton());

    // then
    expect(panelItems()).toEqual(['사진 올리기', '사진 정리', '로그아웃']);
  });
});
