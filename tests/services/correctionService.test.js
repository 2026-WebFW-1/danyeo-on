import { afterEach, expect, test, vi } from 'vitest';

import { addCorrection, getCorrections, removeCorrection } from '@/services/correctionService';
import { getSupabase } from '@/services/getSupabase';
import { getMyData } from '@/services/photoService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));
vi.mock('@/services/photoService', () => ({ getMyData: vi.fn() }));

const rename = { id: 'c_a', type: 'rename', anchorPhotoId: 'p_a', name: '졸업 여행' };

/** corrections 테이블에서 지우는 호출을 흉내 내요. 마지막 select가 응답을 돌려줘요. */
function mockDelete(response) {
  const select = vi.fn().mockResolvedValue(response);
  const eq = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ delete: () => ({ eq }) }));
  vi.mocked(getSupabase).mockResolvedValue({ from });
  return { from, eq, select };
}

afterEach(() => vi.resetAllMocks());

test('getCorrections는 내 데이터 중 보정을 돌려줘요', async () => {
  // given
  vi.mocked(getMyData).mockResolvedValue({ corrections: [rename] });

  // when
  const corrections = await getCorrections();

  // then
  expect(corrections).toEqual([rename]);
});

test('getCorrections가 실패하면 status 0과 받은 코드로 던져요', async () => {
  // given
  vi.mocked(getMyData).mockRejectedValue({ code: 'PGRST301', message: '거절' });

  // when, then
  await expect(getCorrections()).rejects.toEqual({ status: 0, code: 'PGRST301', message: '거절' });
});

test('getCorrections의 오류에 코드가 없으면 LOAD_FAILED로 던져요', async () => {
  // given
  vi.mocked(getMyData).mockRejectedValue(new Error('연결 실패'));

  // when, then
  await expect(getCorrections()).rejects.toEqual({
    status: 0,
    code: 'LOAD_FAILED',
    message: '연결 실패',
  });
});

test('addCorrection은 add_correction에 보정을 보내요', async () => {
  // given
  const rpc = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(getSupabase).mockResolvedValue({ rpc });

  // when
  await addCorrection(rename);

  // then
  expect(rpc).toHaveBeenCalledWith('add_correction', { correction: rename });
});

test('addCorrection이 거절되면 응답의 status와 함께 던져요', async () => {
  // given
  const error = { code: '22023', message: '보정이 가리키는 사진이 없어요: c_a' };
  const rpc = vi.fn().mockResolvedValue({ error, status: 400 });
  vi.mocked(getSupabase).mockResolvedValue({ rpc });

  // when, then
  await expect(addCorrection(rename)).rejects.toEqual({
    status: 400,
    code: '22023',
    message: '보정이 가리키는 사진이 없어요: c_a',
  });
});

test('addCorrection이 서버에 닿지 못하면 status 0과 SAVE_FAILED로 던져요', async () => {
  // given
  vi.mocked(getSupabase).mockRejectedValue(new Error('.env.local을 확인해주세요'));

  // when, then
  await expect(addCorrection(rename)).rejects.toEqual({
    status: 0,
    code: 'SAVE_FAILED',
    message: '.env.local을 확인해주세요',
  });
});

test('removeCorrection은 corrections에서 그 id의 행을 지우고 true를 돌려줘요', async () => {
  // given
  const { from, eq, select } = mockDelete({ data: [{ id: 'c_a' }], error: null });

  // when
  const removed = await removeCorrection('c_a');

  // then
  expect(from).toHaveBeenCalledWith('corrections');
  expect(eq).toHaveBeenCalledWith('id', 'c_a');
  expect(select).toHaveBeenCalledWith('id');
  expect(removed).toBe(true);
});

test('removeCorrection은 지운 행이 없으면(이미 지워졌거나 RLS에 막힘) false를 돌려줘요', async () => {
  // given
  mockDelete({ data: [], error: null });

  // when
  const removed = await removeCorrection('c_a');

  // then
  expect(removed).toBe(false);
});

test('removeCorrection이 거절되면 응답의 status와 함께 던져요', async () => {
  // given
  mockDelete({ data: null, error: { code: '42501', message: '권한이 없어요' }, status: 403 });

  // when, then
  await expect(removeCorrection('c_a')).rejects.toEqual({
    status: 403,
    code: '42501',
    message: '권한이 없어요',
  });
});

test('removeCorrection이 서버에 닿지 못하면 status 0과 REMOVE_FAILED로 던져요', async () => {
  // given
  vi.mocked(getSupabase).mockRejectedValue(new Error('연결 실패'));

  // when, then
  await expect(removeCorrection('c_a')).rejects.toEqual({
    status: 0,
    code: 'REMOVE_FAILED',
    message: '연결 실패',
  });
});
