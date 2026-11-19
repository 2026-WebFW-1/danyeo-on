import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import LegModeMenu from '@/pages/MapPage/LegModeMenu';
import { MAP_SIZE } from '@/utils/routeMap';

const LEG = { id: 'leg_1', from: 'p_a', to: 'p_b', mode: 'train', km: 343 };
const LABEL_HEIGHT = 26;

let container;
let root;

function renderMenu(labelTop) {
  const rect = { left: 600, right: 700, top: labelTop, bottom: labelTop + LABEL_HEIGHT };
  act(() =>
    root.render(
      <svg viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}>
        <LegModeMenu
          leg={LEG}
          rect={rect}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          onDismiss={vi.fn()}
        />
      </svg>,
    ),
  );
  return { rect, box: container.querySelector('foreignObject') };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('LegModeMenu 자리', () => {
  test('보통은 라벨 아래에 열어요', () => {
    const { rect, box } = renderMenu(300);

    expect(Number(box.getAttribute('y'))).toBeGreaterThan(rect.bottom);
  });

  test('라벨 아래로 열면 지도 밖으로 넘칠 땐 라벨 위로 열어요', () => {
    const { rect, box } = renderMenu(MAP_SIZE.height - 60);

    const top = Number(box.getAttribute('y'));
    const height = Number(box.getAttribute('height'));
    expect(top + height).toBeLessThan(rect.top);
    expect(top).toBeGreaterThanOrEqual(0);
  });
});
