import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import PostEditor from '@/pages/ChapterPage/PostEditor';
import { getPosts, savePost } from '@/services/postService';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';

vi.mock('@/services/postService', () => ({ getPosts: vi.fn(), savePost: vi.fn() }));

const DATE = '2025-07-12';
const post = {
  id: 'post_a',
  ownerId: 'u1',
  date: DATE,
  title: '카필라노 흔들다리',
  body: '다리가 흔들렸다',
  tags: ['밴쿠버', '흔들다리'],
  photoIds: ['p_a', 'p_b'],
  updatedAt: '2025-07-12T10:00:00Z',
};

let container;
let root;
let onClose;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const titleInput = () => container.querySelector('input[name="title"]');
const bodyInput = () => container.querySelector('textarea[name="body"]');
const tagInput = () => container.querySelector('input[name="tag"]');
const findButton = (text) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);
const saveButton = () => findButton('저장');
const cancelButton = () => findButton('취소');
const tagTexts = () =>
  [...container.querySelectorAll('button[aria-label$=" 빼기"]')].map((button) =>
    button.getAttribute('aria-label').replace(' 빼기', ''),
  );

/** 사람이 입력한 것처럼 값을 바꿔요. React가 알아채도록 원래 setter로 넣어요. */
async function type(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const { set } = Object.getOwnPropertyDescriptor(prototype, 'value');
  await act(async () => {
    set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function press(element, key, init = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  await act(async () => element.dispatchEvent(event));
}

async function click(element) {
  await act(async () => element.click());
}

async function open(posts = [post], props = {}) {
  vi.mocked(getPosts).mockResolvedValue(posts);
  await act(async () =>
    root.render(<PostEditor date={DATE} dayNumber={15} onClose={onClose} {...props} />),
  );
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  usePostStore.getState().reset();
  useAuthStore.setState({ user: { id: 'u1' } });
  onClose = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  usePostStore.getState().reset();
  useAuthStore.getState().reset();
  vi.resetAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('불러오기', () => {
  test('처음 열면 불러오고, 불러오는 중에는 입력과 저장이 꺼져 있어요', async () => {
    // given
    const request = deferred();
    vi.mocked(getPosts).mockReturnValue(request.promise);

    // when
    await act(async () => root.render(<PostEditor date={DATE} />));

    // then
    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(titleInput().disabled).toBe(true);
    expect(bodyInput().disabled).toBe(true);
    expect(tagInput().disabled).toBe(true);
    expect(saveButton().disabled).toBe(true);

    await act(async () => request.resolve([post]));
    expect(titleInput().disabled).toBe(false);
  });

  test('StrictMode에서도 한 번만 불러와요', async () => {
    // given
    vi.mocked(getPosts).mockResolvedValue([post]);

    // when
    await act(async () =>
      root.render(
        <StrictMode>
          <PostEditor date={DATE} />
        </StrictMode>,
      ),
    );

    // then
    expect(getPosts).toHaveBeenCalledTimes(1);
  });

  test('이미 불러온 뒤에 열면 다시 부르지 않아요', async () => {
    // given
    vi.mocked(getPosts).mockResolvedValue([post]);
    await usePostStore.getState().fetch();

    // when
    await open();

    // then
    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(titleInput().value).toBe(post.title);
  });

  test('실패하면 안내가 보이고 입력과 저장이 꺼지고, 다시 불러올 수 있어요', async () => {
    // given
    vi.mocked(getPosts).mockRejectedValueOnce({ message: '실패' });
    await open();

    // then
    expect(container.textContent).toContain('글을 불러오지 못했어요');
    expect(titleInput().disabled).toBe(true);
    expect(saveButton().disabled).toBe(true);

    // when
    vi.mocked(getPosts).mockResolvedValue([post]);
    await click(findButton('다시 불러오기'));

    // then
    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain('글을 불러오지 못했어요');
    expect(findButton('다시 불러오기')).toBeUndefined();
    expect(titleInput().value).toBe(post.title);
  });
});

describe('날짜 줄', () => {
  test('날짜와 Day를 보여 줘요', async () => {
    await open();
    expect(container.textContent).toContain('2025.07.12 (토) · Day 15');
  });

  test('dayNumber가 없으면 날짜만 보여 줘요', async () => {
    await open([post], { dayNumber: undefined });
    expect(container.textContent).toContain('2025.07.12 (토)');
    expect(container.textContent).not.toContain('Day');
  });
});

describe('입력', () => {
  test('있는 글은 그 내용으로 시작하고 저장이 꺼져 있어요', async () => {
    // when
    await open();

    // then
    expect(titleInput().value).toBe(post.title);
    expect(bodyInput().value).toBe(post.body);
    expect(tagTexts()).toEqual(post.tags);
    expect(saveButton().disabled).toBe(true);
  });

  test('다른 날 글은 가져오지 않고 빈 칸으로 시작해요', async () => {
    // when
    await open([{ ...post, date: '2025-07-20' }]);

    // then
    expect(titleInput().value).toBe('');
    expect(bodyInput().value).toBe('');
    expect(tagTexts()).toEqual([]);
    expect(saveButton().disabled).toBe(true);
  });

  test('고치면 저장이 켜지고, 되돌리면 꺼져요', async () => {
    // given
    await open();

    // when, then
    await type(titleInput(), '새 제목');
    expect(saveButton().disabled).toBe(false);

    await type(titleInput(), post.title);
    expect(saveButton().disabled).toBe(true);
  });

  test('고치던 중에 다시 불러오게 되면 저장이 꺼져요', async () => {
    // given
    await open();
    await type(titleInput(), '새 제목');
    vi.mocked(getPosts).mockReturnValue(new Promise(() => {}));

    // when: 계정이 바뀌어 스토어가 처음 상태로 돌아가요
    await act(async () => usePostStore.getState().reset());

    // then
    expect(saveButton().disabled).toBe(true);
    expect(container.querySelector('button[aria-label="밴쿠버 빼기"]').disabled).toBe(true);
  });

  test('DB 제한대로 글자 수를 막아요', async () => {
    await open();
    expect(titleInput().maxLength).toBe(200);
    expect(bodyInput().maxLength).toBe(10000);
    expect(tagInput().maxLength).toBe(50);
  });
});

describe('태그', () => {
  test('Enter로 추가하고 칸을 비워요', async () => {
    // given
    await open();

    // when
    await type(tagInput(), '#여름');
    await press(tagInput(), 'Enter');

    // then
    expect(tagTexts()).toEqual([...post.tags, '여름']);
    expect(tagInput().value).toBe('');
  });

  test('쉼표로 추가하고, 붙여 넣은 여러 개도 나눠요', async () => {
    // given
    await open();

    // when
    await type(tagInput(), '여름,');
    await type(tagInput(), '겨울, 봄');

    // then
    expect(tagTexts()).toEqual([...post.tags, '여름', '겨울', '봄']);
    expect(tagInput().value).toBe('');
  });

  test('같은 태그는 한 번만 들어가요', async () => {
    // given
    await open();

    // when
    await type(tagInput(), '#밴쿠버');
    await press(tagInput(), 'Enter');

    // then
    expect(tagTexts()).toEqual(post.tags);
    expect(saveButton().disabled).toBe(true);
  });

  test('✕로 빼요', async () => {
    // given
    await open();

    // when
    await click(container.querySelector('button[aria-label="밴쿠버 빼기"]'));

    // then
    expect(tagTexts()).toEqual(['흔들다리']);
    expect(saveButton().disabled).toBe(false);
  });

  test('한글을 조합하는 중의 Enter로는 추가하지 않아요', async () => {
    // given
    await open();
    await type(tagInput(), '여름');

    // when
    await press(tagInput(), 'Enter', { isComposing: true });

    // then
    expect(tagTexts()).toEqual(post.tags);
    expect(tagInput().value).toBe('여름');
  });

  test('Enter 없이 쓴 태그만 있어도 저장이 켜지고 같이 저장돼요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open();

    // when
    await type(tagInput(), '여름');
    expect(saveButton().disabled).toBe(false);
    await click(saveButton());

    // then
    expect(vi.mocked(savePost).mock.calls[0][0].tags).toEqual([...post.tags, '여름']);
  });
});

describe('저장', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** 저장됨 안내를 보여 주는 시간이 지나요. */
  const passNotice = () => act(async () => vi.advanceTimersByTime(1000));

  test('닫으면 사라지는 카드에서도 저장됨을 보여 준 뒤에 닫아요', async () => {
    // given: 02의 카드처럼 onClose가 편집기를 없애요
    vi.mocked(savePost).mockResolvedValue();
    const close = () => root.render(null);
    await open([post], { onClose: close });
    await type(titleInput(), '새 제목');

    // when
    await click(saveButton());

    // then
    expect(container.textContent).toContain('저장됨 · 방금');

    // when
    await passNotice();

    // then
    expect(container.textContent).toBe('');
  });

  test('저장됨을 보여 주는 사이에 다시 고치면 닫지 않아요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());

    // when
    await type(titleInput(), '또 고침');
    await passNotice();

    // then
    expect(onClose).not.toHaveBeenCalled();
    expect(titleInput().value).toBe('또 고침');
  });

  test('저장됨을 보여 주는 사이에 취소하면 한 번만 닫아요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());

    // when
    await click(cancelButton());
    await passNotice();

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('저장 뒤 고쳤다가 되돌려도 저장됨이 되살아나지 않아요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());

    // when
    await type(titleInput(), '또 고침');
    await type(titleInput(), '새 제목');

    // then
    expect(container.textContent).not.toContain('저장됨 · 방금');
  });

  test('네 칸을 보내고, 저장 중에는 저장과 취소가 꺼지고, 성공하면 닫아요', async () => {
    // given
    const request = deferred();
    vi.mocked(savePost).mockReturnValue(request.promise);
    await open();
    await type(titleInput(), '새 제목');
    await type(bodyInput(), '새 본문');

    // when
    await click(saveButton());

    // then
    expect(savePost).toHaveBeenCalledWith({
      id: post.id,
      date: DATE,
      title: '새 제목',
      body: '새 본문',
      tags: post.tags,
      photoIds: post.photoIds,
    });
    expect(container.textContent).toContain('저장 중…');
    expect(saveButton().disabled).toBe(true);
    expect(cancelButton().disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // when
    await act(async () => request.resolve());

    // then
    expect(container.textContent).toContain('저장됨 · 방금');
    expect(saveButton().disabled).toBe(true);
    expect(titleInput().value).toBe('새 제목');
    expect(onClose).not.toHaveBeenCalled();

    // when
    await passNotice();

    // then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('새 글은 사진 없이 저장해요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open([]);
    await type(titleInput(), '첫 글');

    // when
    await click(saveButton());

    // then
    expect(vi.mocked(savePost).mock.calls[0][0]).toMatchObject({
      title: '첫 글',
      body: '',
      tags: [],
      photoIds: [],
    });
  });

  test('onClose 없이도 저장돼요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open([post], { onClose: undefined });
    await type(titleInput(), '새 제목');

    // when
    await click(saveButton());

    // then
    expect(container.textContent).toContain('저장됨 · 방금');
  });

  test('저장한 뒤 다시 고치면 저장됨이 사라져요', async () => {
    // given
    vi.mocked(savePost).mockResolvedValue();
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());

    // when
    await type(titleInput(), '또 새 제목');

    // then
    expect(container.textContent).not.toContain('저장됨 · 방금');
    expect(saveButton().disabled).toBe(false);
  });

  test('실패하면 쓴 내용이 그대로이고, 다시 누르면 저장돼요', async () => {
    // given
    vi.mocked(savePost).mockRejectedValueOnce({ status: 500, code: 'x', message: '실패' });
    await open();
    await type(titleInput(), '새 제목');
    await type(tagInput(), '여름');

    // when
    await click(saveButton());

    // then
    expect(container.textContent).toContain('저장 실패');
    expect(titleInput().value).toBe('새 제목');
    expect(tagInput().value).toBe('여름');
    expect(saveButton().disabled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    // when
    vi.mocked(savePost).mockResolvedValue();
    await click(saveButton());

    // then
    expect(container.textContent).not.toContain('저장 실패');
    await passNotice();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(tagTexts()).toEqual([...post.tags, '여름']);
    expect(tagInput().value).toBe('');
  });
});

describe('취소', () => {
  test('고치기 전 내용으로 돌아가고 닫아요', async () => {
    // given
    await open();
    await type(titleInput(), '새 제목');
    await type(tagInput(), '여름');
    await press(tagInput(), 'Enter');
    await type(tagInput(), '겨울');

    // when
    await click(cancelButton());

    // then
    expect(titleInput().value).toBe(post.title);
    expect(tagTexts()).toEqual(post.tags);
    expect(tagInput().value).toBe('');
    expect(saveButton().disabled).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(savePost).not.toHaveBeenCalled();
  });

  test('저장 실패 뒤 취소하면, 다시 고쳐도 저장 실패가 보이지 않아요', async () => {
    // given
    vi.mocked(savePost).mockRejectedValue({ status: 500, code: 'x', message: '실패' });
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());

    // when
    await click(cancelButton());

    // then
    expect(container.textContent).not.toContain('저장 실패');

    // when
    await type(titleInput(), '또 고침');

    // then
    expect(container.textContent).not.toContain('저장 실패');
  });

  test('저장 실패 뒤 닫았다 다시 열어 고쳐도 저장 실패가 보이지 않아요', async () => {
    // given
    vi.mocked(savePost).mockRejectedValue({ status: 500, code: 'x', message: '실패' });
    await open();
    await type(titleInput(), '새 제목');
    await click(saveButton());
    await act(async () => root.render(null));

    // when
    await open();
    await type(titleInput(), '또 고침');

    // then
    expect(container.textContent).not.toContain('저장 실패');
  });
});
