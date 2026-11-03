import { afterEach, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getMyData } from '@/services/photoService';
import { getPosts, savePost } from '@/services/postService';

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
