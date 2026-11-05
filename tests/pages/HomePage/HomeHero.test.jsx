import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import HomeHero from '@/pages/HomePage/HomeHero';

const RANGE = { from: '2024-07-11', to: '2026-08-16' };
const TOTALS = { cities: 12, photos: 1284, firstTripStart: { year: 2024, month: 7 } };

let root;
let container;

function renderHero(props) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <HomeHero {...props} />
      </MemoryRouter>,
    );
  });
}

function getLinkTargets() {
  return [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('HomeHero', () => {
  test('여행이 있으면 01 재생과 13 올리기로 보내요', () => {
    renderHero({ range: RANGE, totals: TOTALS });

    expect(container.querySelector('h1').textContent).toBe('Two years,twelve cities.');
    expect(getLinkTargets()).toEqual(['/map', '/upload']);
  });

  test('여행이 없으면 재생 버튼 없이 안내만 보여 줘요', () => {
    renderHero({ range: null, totals: { cities: 0, photos: 0, firstTripStart: null } });

    expect(container.querySelector('h1').textContent).toBe('아직 여행이 없어요');
    expect(getLinkTargets()).toEqual(['/upload']);
  });
});
