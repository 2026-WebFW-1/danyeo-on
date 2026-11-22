import { afterEach, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getMyData } from '@/services/photoService';
import { getPosts, removePost, savePost } from '@/services/postService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));
vi.mock('@/services/photoService', () => ({ getMyData: vi.fn() }));

const post = {
  id: 'post_a',
  date: '2025-07-12',
  title: '카필라노',
  body: '',
  tags: [],
  photoIds: [],
};

/** posts 테이블에서 지우는 호출을 흉내 내요. 마지막 select가 응답을 돌려줘요. */
function mockDelete(response) {
  const select = vi.fn().mockResolvedValue(response);
  const eq = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ delete: () => ({ eq }) }));
  vi.mocked(getSupabase).mockResolvedValue({ from });
  return { from, eq, select };
}

afterEach(() => vi.resetAllMocks());

test('getPosts는 내 데이터 중 글을 돌려줘요', async () => {
  // given
  vi.mocked(getMyData).mockResolvedValue({ posts: [post] });

  // when
  const posts = await getPosts();

  // then
  expect(posts).toEqual([post]);
});

test('savePost는 save_post에 글을 보내요', async () => {
  // given
  const rpc = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(getSupabase).mockResolvedValue({ rpc });

  // when
  await savePost(post);

  // then
  expect(rpc).toHaveBeenCalledWith('save_post', { post });
});

test('getPosts가 실패하면 status 0과 받은 코드로 던져요', async () => {
  // given
  vi.mocked(getMyData).mockRejectedValue({ code: 'PGRST301', message: '거절' });

  // when, then
  await expect(getPosts()).rejects.toEqual({ status: 0, code: 'PGRST301', message: '거절' });
});

test('getPosts의 오류에 코드가 없으면 LOAD_FAILED로 던져요', async () => {
  // given
  vi.mocked(getMyData).mockRejectedValue(new Error('연결 실패'));

  // when, then
  await expect(getPosts()).rejects.toEqual({
    status: 0,
    code: 'LOAD_FAILED',
    message: '연결 실패',
  });
});

test('savePost가 거절되면 응답의 status와 함께 던져요', async () => {
  // given
  const error = { code: '42501', message: '권한이 없어요' };
  const rpc = vi.fn().mockResolvedValue({ error, status: 403 });
  vi.mocked(getSupabase).mockResolvedValue({ rpc });

  // when, then
  await expect(savePost(post)).rejects.toEqual({
    status: 403,
    code: '42501',
    message: '권한이 없어요',
  });
});

test('savePost가 서버에 닿지 못하면 status 0과 SAVE_FAILED로 던져요', async () => {
  // given
  vi.mocked(getSupabase).mockRejectedValue(new Error('.env.local을 확인해주세요'));

  // when, then
  await expect(savePost(post)).rejects.toEqual({
    status: 0,
    code: 'SAVE_FAILED',
    message: '.env.local을 확인해주세요',
  });
});

test('removePost는 posts에서 그 id의 행을 지우고 true를 돌려줘요', async () => {
  // given
  const { from, eq, select } = mockDelete({ data: [{ id: 'post_a' }], error: null });

  // when
  const removed = await removePost('post_a');

  // then
  expect(from).toHaveBeenCalledWith('posts');
  expect(eq).toHaveBeenCalledWith('id', 'post_a');
  expect(select).toHaveBeenCalledWith('id');
  expect(removed).toBe(true);
});

test('removePost는 지운 행이 없으면(이미 지워졌거나 RLS에 막힘) false를 돌려줘요', async () => {
  // given
  mockDelete({ data: [], error: null });

  // when
  const removed = await removePost('post_a');

  // then
  expect(removed).toBe(false);
});

test('removePost가 거절되면 응답의 status와 함께 던져요', async () => {
  // given
  mockDelete({ data: null, error: { code: '42501', message: '권한이 없어요' }, status: 403 });

  // when, then
  await expect(removePost('post_a')).rejects.toEqual({
    status: 403,
    code: '42501',
    message: '권한이 없어요',
  });
});

test('removePost가 서버에 닿지 못하면 status 0과 REMOVE_FAILED로 던져요', async () => {
  // given
  vi.mocked(getSupabase).mockRejectedValue(new Error('.env.local을 확인해주세요'));

  // when, then
  await expect(removePost('post_a')).rejects.toEqual({
    status: 0,
    code: 'REMOVE_FAILED',
    message: '.env.local을 확인해주세요',
  });
});
