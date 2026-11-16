import { afterEach, describe, expect, test, vi } from 'vitest';

import { getSupabase } from '@/services/getSupabase';
import { getJourney, saveJourney } from '@/services/journeyService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));

// 계정마다 기억이 남아서, 테스트마다 다른 계정 id를 써요.
let nextUser = 0;
const newUserId = () => `u${(nextUser += 1)}`;

const journeyOf = (name) => ({
  home: { city: name },
  stops: [{ id: `${name}-stop` }],
  legs: [],
  trips: [],
  unlocated: [],
  excluded: [],
  periods: null,
});

// from().select().eq().maybeSingle()이 돌려주는 값을 흉내 내요. 부른 모양은 calls에 남겨요.
// 지금 세션의 계정은 sessionUserId예요. 주지 않으면 요청한 계정과 같아요.
function fakeSupabase(respond, sessionUserId) {
  const calls = [];
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: sessionUserId ?? calls.at(-1)?.value } } },
        error: null,
      }),
    },
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          maybeSingle: async () => {
            calls.push({ table, columns, column, value });
            return respond(value);
          },
        }),
      }),
    }),
  };
  vi.mocked(getSupabase).mockResolvedValue(client);
  return calls;
}

afterEach(() => vi.resetAllMocks());

describe('getJourney', () => {
  test('자기 owner_id 행의 payload를 돌려줘요', async () => {
    // given
    const userId = newUserId();
    const calls = fakeSupabase(() => ({ data: { payload: journeyOf('a') }, error: null }));

    // when
    const journey = await getJourney(userId);

    // then
    expect(calls).toEqual([
      { table: 'journeys', columns: 'payload', column: 'owner_id', value: userId },
    ]);
    expect(journey).toEqual(journeyOf('a'));
  });

  test('행이 없으면 빈 Journey예요(home·periods는 null, 배열은 비어요)', async () => {
    // given
    fakeSupabase(() => ({ data: null, error: null }));

    // when
    const journey = await getJourney(newUserId());

    // then
    expect(journey).toEqual({
      home: null,
      stops: [],
      legs: [],
      trips: [],
      unlocated: [],
      excluded: [],
      periods: null,
    });
  });

  test('오류면 LOAD_FAILED로 거절하고, 다시 부르면 다시 읽어요', async () => {
    // given
    const userId = newUserId();
    let attempt = 0;
    const calls = fakeSupabase(() => {
      attempt += 1;
      return attempt === 1
        ? { data: null, error: { message: 'permission denied' } }
        : { data: { payload: journeyOf('a') }, error: null };
    });

    // when · then
    await expect(getJourney(userId)).rejects.toEqual({
      status: 0,
      code: 'LOAD_FAILED',
      message: 'permission denied',
    });
    await expect(getJourney(userId)).resolves.toEqual(journeyOf('a'));
    expect(calls).toHaveLength(2);
  });

  test('클라이언트를 못 불러와도(.env.local 없음) LOAD_FAILED로 거절해요', async () => {
    // given
    vi.mocked(getSupabase).mockRejectedValue(new Error('.env.local을 확인해주세요'));

    // when · then
    await expect(getJourney(newUserId())).rejects.toEqual({
      status: 0,
      code: 'LOAD_FAILED',
      message: '.env.local을 확인해주세요',
    });
  });

  test('읽는 사이 세션 계정이 바뀌었으면 기억하지 않고 ACCOUNT_CHANGED로 거절해요', async () => {
    // given: A를 읽는 요청이 다른 세션으로 나가서 RLS 때문에 행이 안 보임
    const userA = newUserId();
    fakeSupabase(() => ({ data: null, error: null }), 'someone-else');

    // when · then
    await expect(getJourney(userA)).rejects.toMatchObject({ status: 0, code: 'ACCOUNT_CHANGED' });

    // 다시 A로 부르면 새로 읽어요
    const calls = fakeSupabase(() => ({ data: { payload: journeyOf('a') }, error: null }));
    await expect(getJourney(userA)).resolves.toEqual(journeyOf('a'));
    expect(calls).toHaveLength(1);
  });

  test('같은 계정을 동시에 두 번 불러도 한 번만 읽고 같은 객체예요', async () => {
    // given
    const userId = newUserId();
    const calls = fakeSupabase(() => ({ data: { payload: journeyOf('a') }, error: null }));

    // when
    const [first, second] = await Promise.all([getJourney(userId), getJourney(userId)]);

    // then
    expect(first).toBe(second);
    expect(calls).toHaveLength(1);
  });

  test('다른 계정은 따로 읽어요', async () => {
    // given
    const [userA, userB] = [newUserId(), newUserId()];
    const calls = fakeSupabase((ownerId) => ({
      data: { payload: journeyOf(ownerId) },
      error: null,
    }));

    // when
    const a = await getJourney(userA);
    const b = await getJourney(userB);

    // then
    expect(calls.map((call) => call.value)).toEqual([userA, userB]);
    expect(a).toEqual(journeyOf(userA));
    expect(b).toEqual(journeyOf(userB));
  });
});

// from().upsert().select()이 돌려주는 값을 흉내 내요. 부른 모양은 calls에 남겨요.
// 읽기는 fakeSupabase처럼 payload를 돌려줘요.
function fakeWritableSupabase(respondUpsert, readPayload) {
  const calls = [];
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: calls.findLast((c) => c.value)?.value } } },
        error: null,
      }),
    },
    from: (table) => ({
      upsert: (row, options) => ({
        select: async (columns) => {
          calls.push({ table, row, options, columns });
          return respondUpsert(row);
        },
      }),
      select: () => ({
        eq: (column, value) => ({
          maybeSingle: async () => {
            calls.push({ table, value });
            return { data: { payload: readPayload() }, error: null };
          },
        }),
      }),
    }),
  };
  vi.mocked(getSupabase).mockResolvedValue(client);
  return calls;
}

describe('saveJourney', () => {
  test('내 owner_id 행에 payload·updated_at을 upsert해요', async () => {
    // given
    const userId = newUserId();
    const calls = fakeWritableSupabase(
      (row) => ({ data: [{ owner_id: row.owner_id }], error: null }),
      () => journeyOf('a'),
    );

    // when
    await saveJourney(userId, journeyOf('a'));

    // then
    expect(calls).toEqual([
      {
        table: 'journeys',
        row: { owner_id: userId, payload: journeyOf('a'), updated_at: expect.any(String) },
        options: { onConflict: 'owner_id' },
        columns: 'owner_id',
      },
    ]);
    expect(Number.isNaN(Date.parse(calls[0].row.updated_at))).toBe(false);
  });

  test('쓰고 나면 기억을 지워서 다음 getJourney가 새 Journey를 읽어요', async () => {
    // given
    const userId = newUserId();
    let stored = journeyOf('old');
    fakeWritableSupabase(
      (row) => {
        stored = row.payload;
        return { data: [{ owner_id: row.owner_id }], error: null };
      },
      () => stored,
    );
    expect(await getJourney(userId)).toEqual(journeyOf('old'));

    // when
    await saveJourney(userId, journeyOf('new'));

    // then
    expect(await getJourney(userId)).toEqual(journeyOf('new'));
  });

  test('RLS에 막혀 0행이면 SAVE_FAILED로 거절하고 기억은 그대로 둬요', async () => {
    // given
    const userId = newUserId();
    const calls = fakeWritableSupabase(
      () => ({ data: [], error: null }),
      () => journeyOf('old'),
    );
    await getJourney(userId);

    // when
    const result = saveJourney(userId, journeyOf('new'));

    // then
    await expect(result).rejects.toMatchObject({ status: 0, code: 'SAVE_FAILED' });
    await getJourney(userId);
    expect(calls.filter((call) => call.value === userId)).toHaveLength(1);
  });

  test('Supabase 오류면 SAVE_FAILED로 거절해요', async () => {
    // given
    fakeWritableSupabase(
      () => ({ data: null, error: { message: 'permission denied' } }),
      () => null,
    );

    // when
    const result = saveJourney(newUserId(), journeyOf('a'));

    // then
    await expect(result).rejects.toEqual({
      status: 0,
      code: 'SAVE_FAILED',
      message: 'permission denied',
    });
  });

  test('연결하지 못해도 SAVE_FAILED로 거절해요', async () => {
    // given
    vi.mocked(getSupabase).mockRejectedValue(new Error('no env'));

    // when
    const result = saveJourney(newUserId(), journeyOf('a'));

    // then
    await expect(result).rejects.toEqual({ status: 0, code: 'SAVE_FAILED', message: 'no env' });
  });
});
