import { afterEach, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getPhotoNotes } from '@/services/noteService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));

// from().select().in()이 돌려주는 값을 흉내 내요. 부른 모양은 calls에 남겨요.
function fakeSupabase(respond) {
  const calls = [];
  const client = {
    from: (table) => ({
      select: (columns) => ({
        in: async (column, ids) => {
          calls.push({ table, columns, column, ids });
          return respond(ids);
        },
      }),
    }),
  };
  vi.mocked(getSupabase).mockResolvedValue(client);
  return calls;
}

const rowsOf = (ids) => ids.map((photoId) => ({ photoId, body: `글 ${photoId}` }));

afterEach(() => vi.resetAllMocks());

test('요청한 사진 id의 본문만 photoId 이름으로 읽어요', async () => {
  // given
  const calls = fakeSupabase((ids) => ({ data: rowsOf(ids), error: null }));

  // when
  const notes = await getPhotoNotes(['a', 'b']);

  // then
  expect(calls).toEqual([
    {
      table: 'photo_notes',
      columns: 'photoId:photo_id, body',
      column: 'photo_id',
      ids: ['a', 'b'],
    },
  ]);
  expect(notes).toEqual(rowsOf(['a', 'b']));
});

test('사진 id가 없으면 요청하지 않아요', async () => {
  // when
  const notes = await getPhotoNotes([]);

  // then
  expect(notes).toEqual([]);
  expect(getSupabase).not.toHaveBeenCalled();
});

test('100개가 넘으면 나눠 요청해서 순서대로 합쳐요', async () => {
  // given
  const ids = Array.from({ length: 250 }, (_, index) => `p${index}`);
  const calls = fakeSupabase((chunk) => ({ data: rowsOf(chunk), error: null }));

  // when
  const notes = await getPhotoNotes(ids);

  // then
  expect(calls.map((call) => call.ids.length)).toEqual([100, 100, 50]);
  expect(notes).toEqual(rowsOf(ids));
});

test('글이 없는 사진은 결과에 없어요', async () => {
  // given
  fakeSupabase(() => ({ data: rowsOf(['a']), error: null }));

  // when
  const notes = await getPhotoNotes(['a', 'b']);

  // then
  expect(notes).toEqual(rowsOf(['a']));
});

test('error가 오면 그대로 던져요', async () => {
  // given
  const error = { code: '42501', message: '권한이 없어요' };
  fakeSupabase(() => ({ data: null, error }));

  // when, then
  await expect(getPhotoNotes(['a'])).rejects.toBe(error);
});

test('나눠 보낸 요청 중 하나가 실패해도 던져요', async () => {
  // given
  const ids = Array.from({ length: 150 }, (_, index) => `p${index}`);
  const error = { message: '두 번째 요청 실패' };
  let count = 0;
  fakeSupabase((chunk) => {
    count += 1;
    return count === 2 ? { data: null, error } : { data: rowsOf(chunk), error: null };
  });

  // when, then
  await expect(getPhotoNotes(ids)).rejects.toBe(error);
});
