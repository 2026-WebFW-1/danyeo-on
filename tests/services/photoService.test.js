import { afterEach, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getPhotoImageUrl } from '@/services/photoService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));

const bucket = { createSignedUrl: vi.fn() };
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
