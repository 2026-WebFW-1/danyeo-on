import { afterEach, describe, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getPhotoImageUrl, getUploadedImagePaths } from '@/services/photoService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));

const bucket = { createSignedUrl: vi.fn(), list: vi.fn() };
const supabase = { storage: { from: vi.fn(() => bucket) } };

afterEach(() => vi.clearAllMocks());

test('올린 사진의 버킷 경로로 한 시간짜리 서명 주소를 받아요', async () => {
  // given
  vi.mocked(getSupabase).mockResolvedValue(supabase);
  bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null });

  // when
  const url = await getPhotoImageUrl('photos:u1/p_a', 'thumb');

  // then
  expect(url).toBe('https://signed');
  expect(supabase.storage.from).toHaveBeenCalledWith('photos');
  expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/thumb/p_a.webp', 3600);
});

test('올린 사진 키가 아니면 요청하지 않고 오류를 던져요', async () => {
  await expect(getPhotoImageUrl('demo:x/seojin/a.webp', 'full')).rejects.toThrow();
  expect(getSupabase).not.toHaveBeenCalled();
});

describe('getUploadedImagePaths', () => {
  /** 이름 n개를 list 응답 모양으로 만들어요. */
  const filesOf = (prefix, count) =>
    Array.from({ length: count }, (_, i) => ({ name: `${prefix}${i}.webp` }));

  test('보기용·썸네일 폴더의 파일을 폴더 경로를 붙여 모아요', async () => {
    // given
    vi.mocked(getSupabase).mockResolvedValue(supabase);
    bucket.list.mockImplementation(async (folder) => ({
      data:
        folder === 'u1/full'
          ? [{ name: 'p_a.webp' }]
          : [{ name: 'p_a.webp' }, { name: 'p_b.webp' }],
      error: null,
    }));

    // when
    const paths = await getUploadedImagePaths('u1');

    // then
    expect(paths).toEqual(new Set(['u1/full/p_a.webp', 'u1/thumb/p_a.webp', 'u1/thumb/p_b.webp']));
    expect(supabase.storage.from).toHaveBeenCalledWith('photos');
  });

  test('한 번에 다 못 받으면 offset을 늘려 끝까지 받아요', async () => {
    // given: 보기용이 1000개 + 2개라 두 번에 나눠 와요
    vi.mocked(getSupabase).mockResolvedValue(supabase);
    bucket.list.mockImplementation(async (folder, { offset }) => {
      if (folder === 'u1/thumb') return { data: [], error: null };
      return { data: offset === 0 ? filesOf('p_', 1000) : filesOf('p_last', 2), error: null };
    });

    // when
    const paths = await getUploadedImagePaths('u1');

    // then
    expect(paths.size).toBe(1002);
    expect(paths.has('u1/full/p_last1.webp')).toBe(true);
    expect(bucket.list).toHaveBeenCalledWith('u1/full', { limit: 1000, offset: 1000 });
  });

  test('목록을 못 받으면 오류를 던져요', async () => {
    // given
    vi.mocked(getSupabase).mockResolvedValue(supabase);
    bucket.list.mockResolvedValue({ data: null, error: new Error('권한 없음') });

    // when, then
    await expect(getUploadedImagePaths('u1')).rejects.toThrow('권한 없음');
  });
});
