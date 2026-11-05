import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';

import DestinationLabel from '@/pages/MapPage/DestinationLabel';

const BOX_WIDTH = 180;
// 1024×768 창에서 보이는 오른쪽 끝의 지도 x 좌표예요.
const VISIBLE_RIGHT_X = 1295;

let root;
let container;

function renderBoxX(x) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <svg>
        <DestinationLabel x={x} y={100} name="토론토" />
      </svg>,
    );
  });
  return Number(container.querySelector('foreignObject').getAttribute('x'));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DestinationLabel', () => {
  test('보이는 영역에 들어가면 지점 오른쪽에 놓아요', () => {
    expect(renderBoxX(725)).toBe(739);
  });

  test.each([[1102], [1242], [1290]])(
    '좁은 창에서 라벨이 잘리는 x=%i는 지점 왼쪽에 놓아요',
    (x) => {
      const boxX = renderBoxX(x);
      expect(boxX + BOX_WIDTH).toBeLessThan(x);
      expect(boxX + BOX_WIDTH).toBeLessThan(VISIBLE_RIGHT_X);
    },
  );
});
