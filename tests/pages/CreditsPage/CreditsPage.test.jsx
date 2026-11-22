import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { usePhotoCredits } from '@/hooks/usePhotoCredits';
import CreditsPage from '@/pages/CreditsPage/CreditsPage';

vi.mock('@/hooks/usePhotoCredits', () => ({ usePhotoCredits: vi.fn() }));

const CREDITS = [
  {
    fileName: 'commons-1.webp',
    title: 'Seoul at dawn',
    author: 'Syced',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Seoul.jpg',
  },
  {
    fileName: 'a.webp',
    title: 'Busan from orbit',
    author: 'NASA',
    license: 'Public domain',
    licenseUrl: null,
    sourceUrl: null,
  },
];

let container;
let root;

async function open(result) {
  vi.mocked(usePhotoCredits).mockReturnValue(result);
  await act(() => root.render(<CreditsPage />));
}

function getLink(text) {
  return [...container.querySelectorAll('a')].find((link) => link.textContent === text);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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

describe('CreditsPage', () => {
  test('OSM 표기가 저작권 안내로 이어지고 세계 지도 출처를 보여 줘요', async () => {
    await open({ credits: [], status: 'ready' });

    expect(getLink('© OpenStreetMap contributors').href).toBe(
      'https://www.openstreetmap.org/copyright',
    );
    expect(getLink('Natural Earth')).toBeDefined();
    expect(getLink('world-atlas')).toBeDefined();
  });

  test('데모 사진이 없는 계정은 사진 영역을 그리지 않아요', async () => {
    await open({ credits: [], status: 'ready' });

    expect(container.querySelector('#credits-photo')).toBeNull();
    expect(container.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  test('데모 사진마다 제목 · 저작자 · 라이선스를 보여 주고 원본과 라이선스로 이어요', async () => {
    await open({ credits: CREDITS, status: 'ready' });

    expect(container.querySelector('#credits-photo').textContent).toBe('데모 사진 2장');
    expect([...container.querySelectorAll('li')].map((row) => row.textContent)).toEqual([
      'Seoul at dawnSycedCC0',
      'Busan from orbitNASAPublic domain',
    ]);
    expect(getLink('Seoul at dawn').href).toBe(CREDITS[0].sourceUrl);
    expect(getLink('CC0').href).toBe(CREDITS[0].licenseUrl);
    expect(getLink('Busan from orbit')).toBeUndefined();
    expect(getLink('Public domain')).toBeUndefined();
  });

  test('받는 동안과 못 받았을 때 알려요', async () => {
    await open({ credits: [], status: 'loading' });
    expect(container.querySelector('[role="status"]').textContent).toContain('불러오는 중');

    await open({ credits: [], status: 'error' });
    expect(container.querySelector('[role="alert"]').textContent).toContain('불러오지 못했어요');
  });
});
