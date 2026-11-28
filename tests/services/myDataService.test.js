import { afterEach, expect, test, vi } from 'vitest';

import { beginDeleteAll } from '@/services/deleteAllGate';
import { getSupabase } from '@/services/getSupabase';
import { deleteJourney } from '@/services/journeyService';
import { deleteAllMyData } from '@/services/myDataService';
import { clearMyPhotos } from '@/services/myPhotosService';
import { deleteAllUploadedImages } from '@/services/photoService';

vi.mock('@/services/deleteAllGate', () => ({ beginDeleteAll: vi.fn() }));
vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));
vi.mock('@/services/journeyService', () => ({ deleteJourney: vi.fn() }));
vi.mock('@/services/myPhotosService', () => ({ clearMyPhotos: vi.fn() }));
vi.mock('@/services/photoService', () => ({ deleteAllUploadedImages: vi.fn() }));

afterEach(() => vi.resetAllMocks());

/**
 * from(table).delete().eq()를 흉내 내요. 부른 순서는 steps에 남겨요.
 * failTable이면 그 테이블에서 오류를 돌려줘요.
 */
function fakeSupabase(steps, failTable) {
  vi.mocked(getSupabase).mockResolvedValue({
    from: (table) => ({
      delete: () => ({
        eq: async (column, value) => {
          steps.push(`${table}:${column}=${value}`);
          return { error: table === failTable ? new Error(`${table} 권한 없음`) : null };
        },
      }),
    }),
  });
  vi.mocked(deleteAllUploadedImages).mockImplementation(async () => steps.push('images'));
  vi.mocked(deleteJourney).mockImplementation(async () => steps.push('journey'));
  vi.mocked(beginDeleteAll).mockImplementation(() => {
    steps.push('begin');
    return () => steps.push('end');
  });
  vi.mocked(clearMyPhotos).mockImplementation(() => steps.push('clearMyPhotos'));
}

test('Journey, 글 · 보정 · 사진 행, 이미지 순서로 내 것만 지우고 사진 기억을 비워요', async () => {
  // given
  const steps = [];
  fakeSupabase(steps);

  // when
  await deleteAllMyData('u1');

  // then
  expect(steps).toEqual([
    'begin',
    'journey',
    'posts:owner_id=u1',
    'corrections:owner_id=u1',
    'photos:owner_id=u1',
    'clearMyPhotos',
    'images',
    'end',
  ]);
  expect(deleteAllUploadedImages).toHaveBeenCalledWith('u1');
  expect(deleteJourney).toHaveBeenCalledWith('u1');
});

test('행을 지우지 못하면 던지고 뒤 단계는 하지 않아요', async () => {
  // given
  const steps = [];
  fakeSupabase(steps, 'corrections');

  // when
  const deleting = deleteAllMyData('u1');

  // then
  await expect(deleting).rejects.toThrow('corrections 권한 없음');
  expect(steps).toEqual([
    'begin',
    'journey',
    'posts:owner_id=u1',
    'corrections:owner_id=u1',
    'end',
  ]);
});

test('Journey를 지우지 못하면 던지고 행은 건드리지 않아요', async () => {
  // given
  const steps = [];
  fakeSupabase(steps);
  vi.mocked(deleteJourney).mockRejectedValue(new Error('journeys 실패'));

  // when
  const deleting = deleteAllMyData('u1');

  // then
  await expect(deleting).rejects.toThrow('journeys 실패');
  expect(steps).toEqual(['begin', 'end']);
});

test('이미지를 지우지 못해도 던지지 않아요. 행은 이미 지워져 남은 파일을 가리키는 화면이 없어요', async () => {
  // given
  const steps = [];
  fakeSupabase(steps);
  const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(deleteAllUploadedImages).mockRejectedValue(new Error('storage 실패'));

  // when
  await deleteAllMyData('u1');

  // then
  expect(clearMyPhotos).toHaveBeenCalledOnce();
  expect(logError).toHaveBeenCalledWith(new Error('storage 실패'));
  logError.mockRestore();
});
