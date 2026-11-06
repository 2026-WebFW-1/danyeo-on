import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { usePhotoNotes } from '@/hooks/usePhotoNotes';
import { getPhotoNotes } from '@/services/noteService';

vi.mock('@/services/noteService', () => ({ getPhotoNotes: vi.fn() }));

let container;
let root;
let latest;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// 렌더 중에 바깥 변수를 바꾸면 안 돼서, 값은 effect에서 테스트로 내보내요.
function Probe({ photoIds, onResult }) {
  const result = usePhotoNotes(photoIds);
  useEffect(() => onResult(result));
  return null;
}

async function mount(photoIds) {
  await act(async () =>
    root.render(
      <Probe
        photoIds={photoIds}
        onResult={(result) => {
          latest = result;
        }}
      />,
    ),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.resetAllMocks();
});

describe('usePhotoNotes', () => {
  test('받는 동안은 loading이고 글은 빈 객체예요', async () => {
    vi.mocked(getPhotoNotes).mockReturnValue(deferred().promise);

    await mount(['a']);

    expect(latest).toEqual({ notes: {}, status: 'loading', error: null });
  });

  test('다 받으면 사진 id로 본문을 찾을 수 있어요', async () => {
    vi.mocked(getPhotoNotes).mockResolvedValue([
      { photoId: 'a', body: '첫 사진' },
      { photoId: 'b', body: '둘째 사진' },
    ]);

    await mount(['a', 'b', 'c']);

    expect(latest).toEqual({
      notes: { a: '첫 사진', b: '둘째 사진' },
      status: 'ready',
      error: null,
    });
    expect(getPhotoNotes).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  test('실패하면 error와 빈 객체고 던지지 않아요', async () => {
    const error = { message: '연결 실패' };
    vi.mocked(getPhotoNotes).mockRejectedValue(error);

    await mount(['a']);

    expect(latest).toEqual({ notes: {}, status: 'error', error });
  });

  test('읽을 사진이 없으면 요청하지 않고 바로 ready예요', async () => {
    await mount([]);

    expect(latest).toEqual({ notes: {}, status: 'ready', error: null });
    expect(getPhotoNotes).not.toHaveBeenCalled();
  });

  test('같은 사진 id를 새 배열로 다시 줘도 다시 읽지 않아요', async () => {
    vi.mocked(getPhotoNotes).mockResolvedValue([]);
    await mount(['a', 'b']);

    await mount(['a', 'b']);

    expect(getPhotoNotes).toHaveBeenCalledTimes(1);
  });

  test('사진 id가 바뀌면 곧바로 loading이 되고 새 사진들의 글을 줘요', async () => {
    const second = deferred();
    vi.mocked(getPhotoNotes)
      .mockResolvedValueOnce([{ photoId: 'a', body: '앞 사진' }])
      .mockReturnValueOnce(second.promise);
    await mount(['a']);
    expect(latest.notes).toEqual({ a: '앞 사진' });

    await mount(['b']);

    expect(latest).toEqual({ notes: {}, status: 'loading', error: null });

    await act(async () => second.resolve([{ photoId: 'b', body: '새 사진' }]));

    expect(latest.notes).toEqual({ b: '새 사진' });
  });

  test('늦게 도착한 앞 사진들의 결과는 버려요', async () => {
    const first = deferred();
    vi.mocked(getPhotoNotes)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce([{ photoId: 'b', body: '새 사진' }]);
    await mount(['a']);

    await mount(['b']);
    await act(async () => first.resolve([{ photoId: 'a', body: '앞 사진' }]));

    expect(latest.notes).toEqual({ b: '새 사진' });
  });
});
