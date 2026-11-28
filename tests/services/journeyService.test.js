import { afterEach, describe, expect, test, vi } from 'vitest';

import { UNKNOWN_PLACE } from '@/constants/geocode';
import { JOURNEY_RULES_VERSION } from '@/constants/journey';
import { getSupabase } from '@/services/getSupabase';
import {
  deleteJourney,
  getJourney,
  getJourneyVersion,
  refreshJourney,
  saveJourney,
  subscribeJourney,
} from '@/services/journeyService';
import { clearMyPhotos } from '@/services/myPhotosService';
import { getMyData } from '@/services/photoService';
import { reverseCity } from '@/services/reverseCity';
import { buildJourney } from '@/utils/journey/buildJourney';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));
vi.mock('@/services/photoService', () => ({ getMyData: vi.fn() }));
vi.mock('@/services/myPhotosService', () => ({ clearMyPhotos: vi.fn() }));
vi.mock('@/utils/journey/buildJourney', () => ({ buildJourney: vi.fn() }));
vi.mock('@/services/reverseCity', () => ({ reverseCity: vi.fn() }));

// 계정마다 기억이 남아서, 테스트마다 다른 계정 id를 써요.
let nextUser = 0;
const newUserId = () => `u${(nextUser += 1)}`;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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

  test('쓰고 나면 구독자에게 알려서 열린 화면이 다시 읽게 해요', async () => {
    // given
    fakeWritableSupabase(
      (row) => ({ data: [{ owner_id: row.owner_id }], error: null }),
      () => null,
    );
    const listener = vi.fn();
    const unsubscribe = subscribeJourney(listener);
    const before = getJourneyVersion();

    // when
    await saveJourney(newUserId(), journeyOf('a'));
    unsubscribe();

    // then
    expect(listener).toHaveBeenCalledOnce();
    expect(getJourneyVersion()).toBe(before + 1);
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

const myDataOf = (userId) => ({
  user: { id: userId },
  photos: [{ id: 'p1', ownerId: userId }],
  corrections: [{ id: 'c1', type: 'rename' }],
  posts: [],
});

const savedRow = (row) => ({ data: [{ owner_id: row.owner_id }], error: null });
const noRow = () => ({ data: [], error: null });

// fakeWritableSupabase의 calls에는 읽기도 남아요. refreshJourney가 저장된 Journey를 먼저 읽어서 쓰기만 골라 봐요.
const writesOf = (calls) => calls.filter((call) => call.row);

const VANCOUVER = { lat: 49.30877, lng: -123.11272 };
const SEED_VANCOUVER = { city: '밴쿠버', country: '캐나다', cc: 'CA' };
const FOUND_PLACE = { city: 'District of North Vancouver', country: '캐나다', cc: 'CA' };
// 위도 0.02도는 약 2.2km예요.
const FAR = 0.02;

const savedJourneyWithVancouver = () => ({
  ...journeyOf('saved'),
  stops: [{ id: 'p_van', ...VANCOUVER, ...SEED_VANCOUVER }],
});

const SEOUL = { lat: 37.55789, lng: 126.92071 };
const SEOUL_PLACE = { city: '서울', country: '한국', cc: 'KR' };

// 저장된 집에는 나라 이름 없이 도시 이름과 나라 코드만 있어요(Journey.home, #179).
const savedJourneyWithSeoulHome = () => ({
  ...journeyOf('saved'),
  home: { ...SEOUL, city: '서울', cc: 'KR' },
});
// #179 전에 저장된 집이에요. 나라 코드가 없어요.
const savedJourneyWithOldSeoulHome = () => ({
  ...journeyOf('saved'),
  home: { ...SEOUL, city: '서울' },
});

describe('deleteJourney', () => {
  // from().delete().eq()와 읽기를 흉내 내요. 지우면 읽기가 빈 행을 줘요.
  function fakeDeletableSupabase(deleteError = null) {
    const calls = [];
    let stored = journeyOf('old');
    const client = {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: calls.findLast((c) => c.value)?.value } } },
          error: null,
        }),
      },
      from: (table) => ({
        upsert: (row) => ({
          select: async () => {
            calls.push({ table, action: 'upsert', value: row.owner_id });
            stored = row.payload;
            return { data: [{ owner_id: row.owner_id }], error: null };
          },
        }),
        delete: () => ({
          eq: async (column, value) => {
            calls.push({ table, action: 'delete', column, value });
            if (!deleteError) stored = null;
            return { error: deleteError };
          },
        }),
        select: () => ({
          eq: (column, value) => ({
            maybeSingle: async () => {
              calls.push({ table, value });
              return { data: stored && { payload: stored }, error: null };
            },
          }),
        }),
      }),
    };
    vi.mocked(getSupabase).mockResolvedValue(client);
    return calls;
  }

  test('내 owner_id 행을 지워요', async () => {
    // given
    const userId = newUserId();
    const calls = fakeDeletableSupabase();

    // when
    await deleteJourney(userId);

    // then
    expect(calls).toEqual([
      { table: 'journeys', action: 'delete', column: 'owner_id', value: userId },
    ]);
  });

  test('지우고 나면 기억을 지우고 알려서, 다음 getJourney가 빈 Journey를 읽어요', async () => {
    // given
    const userId = newUserId();
    fakeDeletableSupabase();
    expect(await getJourney(userId)).toEqual(journeyOf('old'));
    const listener = vi.fn();
    const unsubscribe = subscribeJourney(listener);

    // when
    await deleteJourney(userId);
    unsubscribe();

    // then
    expect(listener).toHaveBeenCalledOnce();
    expect((await getJourney(userId)).stops).toEqual([]);
  });

  test('지우지 못하면 DELETE_FAILED로 거절하고 기억은 그대로 둬요', async () => {
    // given
    const userId = newUserId();
    fakeDeletableSupabase({ message: 'denied' });
    expect(await getJourney(userId)).toEqual(journeyOf('old'));

    // when
    const result = deleteJourney(userId);

    // then
    await expect(result).rejects.toEqual({ status: 0, code: 'DELETE_FAILED', message: 'denied' });
    expect(await getJourney(userId)).toEqual(journeyOf('old'));
  });

  test('지우기 전에 시작한 계산은 지운 뒤에 끝나도 저장하지 않고 빈 Journey를 받아요', async () => {
    // given: 지우기 전에 사진을 읽고 계산하는 중이에요
    const userId = newUserId();
    const calls = fakeDeletableSupabase();
    const building = deferred();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockReturnValue(building.promise);
    const refreshing = refreshJourney(userId);
    await vi.waitFor(() => expect(buildJourney).toHaveBeenCalled());

    // when
    await deleteJourney(userId);
    building.resolve(journeyOf('old'));
    const journey = await refreshing;

    // then
    expect(journey.stops).toEqual([]);
    expect(calls.filter((call) => call.action === 'upsert')).toEqual([]);
    expect((await getJourney(userId)).stops).toEqual([]);
  });
});

describe('refreshJourney', () => {
  test('내 사진·보정으로 계산해서 저장하고, 사진 기억을 지워요', async () => {
    // given
    const userId = newUserId();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
    const calls = fakeWritableSupabase(savedRow, () => journeyOf('new'));

    // when
    const journey = await refreshJourney(userId);

    // then
    expect(buildJourney).toHaveBeenCalledWith(
      myDataOf(userId).photos,
      myDataOf(userId).corrections,
      expect.any(Function),
    );
    const writes = writesOf(calls);
    expect(writes).toHaveLength(1);
    expect(writes[0].row).toMatchObject({ owner_id: userId, payload: journeyOf('new') });
    expect(clearMyPhotos).toHaveBeenCalledOnce();
    expect(journey).toEqual(journeyOf('new'));
  });

  test('읽지 못하면 LOAD_FAILED이고 계산하지 않아요', async () => {
    // given
    vi.mocked(getMyData).mockRejectedValue(new Error('offline'));

    // when
    const result = refreshJourney(newUserId());

    // then
    await expect(result).rejects.toEqual({ status: 0, code: 'LOAD_FAILED', message: 'offline' });
    expect(buildJourney).not.toHaveBeenCalled();
  });

  test('읽는 사이 계정이 바뀌면 ACCOUNT_CHANGED이고 계산하지 않아요', async () => {
    // given
    vi.mocked(getMyData).mockResolvedValue(myDataOf('someone-else'));

    // when
    const result = refreshJourney(newUserId());

    // then
    await expect(result).rejects.toMatchObject({ status: 0, code: 'ACCOUNT_CHANGED' });
    expect(buildJourney).not.toHaveBeenCalled();
  });

  test('계산하다 오류가 나면 BUILD_FAILED이고 저장하지 않아요', async () => {
    // given
    const userId = newUserId();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockRejectedValue(new Error('bad photo'));
    const calls = fakeWritableSupabase(noRow, () => null);

    // when
    const result = refreshJourney(userId);

    // then
    await expect(result).rejects.toEqual({ status: 0, code: 'BUILD_FAILED', message: 'bad photo' });
    expect(writesOf(calls)).toEqual([]);
  });

  test('저장하지 못하면 SAVE_FAILED이고 사진 기억은 그대로 둬요', async () => {
    // given
    const userId = newUserId();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
    fakeWritableSupabase(noRow, () => null);

    // when
    const result = refreshJourney(userId);

    // then
    await expect(result).rejects.toMatchObject({ status: 0, code: 'SAVE_FAILED' });
    expect(clearMyPhotos).not.toHaveBeenCalled();
  });

  test('겹쳐 부르면 나중에 부른 계산만 저장하고, 앞서 부른 쪽도 그 결과를 받아요', async () => {
    // given 앞 계산이 도시 이름을 찾는 사이 새 계산이 시작돼 먼저 끝나요
    const userId = newUserId();
    const firstBuild = deferred();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney)
      .mockReturnValueOnce(firstBuild.promise)
      .mockResolvedValueOnce(journeyOf('second'));
    const calls = fakeWritableSupabase(savedRow, () => null);

    // when
    const first = refreshJourney(userId);
    const second = refreshJourney(userId);
    await expect(second).resolves.toEqual(journeyOf('second'));
    firstBuild.resolve(journeyOf('first'));

    // then
    await expect(first).resolves.toEqual(journeyOf('second'));
    expect(writesOf(calls).map((call) => call.row.payload)).toEqual([journeyOf('second')]);
  });

  test('새 계산이 시작된 뒤 앞 계산이 실패해도 새 계산의 결과를 받아요', async () => {
    // given
    const userId = newUserId();
    const firstBuild = deferred();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney)
      .mockReturnValueOnce(firstBuild.promise)
      .mockResolvedValueOnce(journeyOf('second'));
    fakeWritableSupabase(savedRow, () => null);

    // when
    const first = refreshJourney(userId);
    const second = refreshJourney(userId);
    firstBuild.reject(new Error('bad photo'));

    // then
    await expect(first).resolves.toEqual(journeyOf('second'));
    await expect(second).resolves.toEqual(journeyOf('second'));
  });

  test('앞 계산이 쓰는 중이면 새 계산은 그 쓰기가 끝난 뒤에 써요', async () => {
    // given 앞 계산이 최신일 때 쓰기를 시작했고, 쓰는 사이 새 계산이 시작돼요
    const userId = newUserId();
    const firstWrite = deferred();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney)
      .mockResolvedValueOnce(journeyOf('first'))
      .mockResolvedValueOnce(journeyOf('second'));
    const calls = fakeWritableSupabase(
      (row) => (row.payload.home.city === 'first' ? firstWrite.promise : savedRow(row)),
      () => null,
    );
    const first = refreshJourney(userId);
    await vi.waitFor(() => expect(writesOf(calls)).toHaveLength(1));

    // when
    const second = refreshJourney(userId);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // then 새 계산은 앞 쓰기를 기다려서, 마지막에 남는 건 새 계산이에요
    expect(writesOf(calls)).toHaveLength(1);
    firstWrite.resolve(savedRow({ owner_id: userId }));
    await expect(first).resolves.toEqual(journeyOf('first'));
    await expect(second).resolves.toEqual(journeyOf('second'));
    expect(writesOf(calls).map((call) => call.row.payload)).toEqual([
      journeyOf('first'),
      journeyOf('second'),
    ]);
  });

  describe('저장된 이름 다시 쓰기(#158)', () => {
    test('저장된 지점 근처는 저장된 이름을 써서, 이름 찾기가 실패하는 중이어도 덮이지 않아요', async () => {
      // given 이름 찾기가 쉬는 중이라 reverseCity가 이름 없는 곳만 돌려줘요
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue({ ...UNKNOWN_PLACE });
      fakeWritableSupabase(savedRow, savedJourneyWithVancouver);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(VANCOUVER.lat, VANCOUVER.lng);

      // then
      expect(place).toEqual(SEED_VANCOUVER);
      expect(reverseCity).not.toHaveBeenCalled();
    });

    test('저장된 이름이 없는 곳은 reverseCity로 새로 찾아요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue(FOUND_PLACE);
      fakeWritableSupabase(savedRow, savedJourneyWithVancouver);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(VANCOUVER.lat + FAR, VANCOUVER.lng);

      // then
      expect(place).toEqual(FOUND_PLACE);
      expect(reverseCity).toHaveBeenCalledWith(VANCOUVER.lat + FAR, VANCOUVER.lng);
    });

    test('저장된 Journey를 못 읽어도 모두 새로 찾아서 계산·저장해요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue(FOUND_PLACE);
      const calls = fakeWritableSupabase(savedRow, () => {
        throw new Error('offline');
      });

      // when
      const journey = await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(VANCOUVER.lat, VANCOUVER.lng);

      // then
      expect(journey).toEqual(journeyOf('new'));
      expect(writesOf(calls)).toHaveLength(1);
      expect(place).toEqual(FOUND_PLACE);
      expect(reverseCity).toHaveBeenCalledOnce();
    });

    test('집을 찾을 때는 저장된 집 이름을 써요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue({ ...UNKNOWN_PLACE });
      fakeWritableSupabase(savedRow, savedJourneyWithSeoulHome);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(SEOUL.lat, SEOUL.lng, { isHome: true });

      // then
      expect(place).toMatchObject({ city: '서울', cc: 'KR' });
      expect(reverseCity).not.toHaveBeenCalled();
    });

    test('저장된 집에 나라 코드가 없으면(#179 전에 저장됨) 한 번 더 찾아 나라 코드만 채워요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue({ ...SEOUL_PLACE, city: '마포구' });
      fakeWritableSupabase(savedRow, savedJourneyWithOldSeoulHome);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(SEOUL.lat, SEOUL.lng, { isHome: true });

      // then: 도시 이름은 저장된 이름 그대로예요
      expect(place).toEqual({ city: '서울', country: '한국', cc: 'KR' });
      expect(reverseCity).toHaveBeenCalledOnce();
    });

    test('나라 코드를 채우려다 이름 찾기가 실패하면 저장된 집 이름을 그대로 써요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue({ ...UNKNOWN_PLACE });
      fakeWritableSupabase(savedRow, savedJourneyWithOldSeoulHome);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(SEOUL.lat, SEOUL.lng, { isHome: true });

      // then
      expect(place).toEqual({ city: '서울', country: '', cc: '' });
    });

    test('집이 바뀌어 저장된 집 자리가 여행 지점이 되면 reverseCity로 나라까지 새로 찾아요', async () => {
      // given
      const userId = newUserId();
      vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
      vi.mocked(buildJourney).mockResolvedValue(journeyOf('new'));
      vi.mocked(reverseCity).mockResolvedValue(SEOUL_PLACE);
      fakeWritableSupabase(savedRow, savedJourneyWithSeoulHome);

      // when
      await refreshJourney(userId);
      const [, , findPlace] = vi.mocked(buildJourney).mock.calls[0];
      const place = await findPlace(SEOUL.lat, SEOUL.lng);

      // then
      expect(place).toEqual(SEOUL_PLACE);
      expect(reverseCity).toHaveBeenCalledWith(SEOUL.lat, SEOUL.lng);
    });
  });
});

describe('옛 규칙으로 저장된 Journey 다시 계산하기(#247)', () => {
  const LEG = { id: 'leg_1', mode: 'train' };
  const oldJourney = () => ({ ...journeyOf('old'), legs: [LEG] });
  const newJourney = () => ({
    ...journeyOf('new'),
    legs: [{ ...LEG, mode: 'flight' }],
    rulesVersion: JOURNEY_RULES_VERSION,
  });
  // 뒤에서 도는 계산이 끝날 때까지 기다려요.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test('판이 없는 Journey를 읽으면 그대로 돌려주고, 뒤에서 다시 계산해 저장해요', async () => {
    // given
    const userId = newUserId();
    let saved = oldJourney();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockResolvedValue(newJourney());
    const calls = fakeWritableSupabase(
      (row) => {
        saved = row.payload;
        return savedRow(row);
      },
      () => saved,
    );

    // when
    const first = await getJourney(userId);
    await settle();

    // then: 화면은 기다리지 않고 저장된 Journey를 먼저 받아요
    expect(first).toEqual(oldJourney());
    expect(writesOf(calls)).toHaveLength(1);
    expect(writesOf(calls)[0].row.payload).toEqual(newJourney());
    // 저장하면 기억이 지워져서 다음에는 새 Journey를 읽고, 판이 같아서 또 계산하지 않아요
    expect(await getJourney(userId)).toEqual(newJourney());
    await settle();
    expect(buildJourney).toHaveBeenCalledOnce();
  });

  test('판이 다른 Journey도 다시 계산해요', async () => {
    // given
    const userId = newUserId();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockResolvedValue(newJourney());
    fakeWritableSupabase(savedRow, () => ({
      ...oldJourney(),
      rulesVersion: JOURNEY_RULES_VERSION - 1,
    }));

    // when
    await getJourney(userId);
    await settle();

    // then
    expect(buildJourney).toHaveBeenCalledOnce();
  });

  test.each([
    ['판이 같으면', () => newJourney()],
    ['구간이 없으면(규칙이 바뀌어도 달라질 게 없어요)', () => journeyOf('no-legs')],
  ])('%s 다시 계산하지 않아요', async (_, readPayload) => {
    // given
    const userId = newUserId();
    const calls = fakeWritableSupabase(savedRow, readPayload);

    // when
    await getJourney(userId);
    await settle();

    // then
    expect(getMyData).not.toHaveBeenCalled();
    expect(writesOf(calls)).toHaveLength(0);
  });

  test('다시 계산하다 실패해도 저장된 Journey는 그대로 받아요', async () => {
    // given
    const userId = newUserId();
    vi.mocked(getMyData).mockRejectedValue(new Error('offline'));
    const calls = fakeWritableSupabase(savedRow, oldJourney);

    // when
    const journey = await getJourney(userId);
    await settle();

    // then
    expect(journey).toEqual(oldJourney());
    expect(writesOf(calls)).toHaveLength(0);
  });

  test('사진 저장처럼 이미 다시 계산을 시작한 계정은 읽을 때 또 시작하지 않아요', async () => {
    // given: refreshJourney가 저장된 Journey(옛 판)를 읽어요
    const userId = newUserId();
    vi.mocked(getMyData).mockResolvedValue(myDataOf(userId));
    vi.mocked(buildJourney).mockResolvedValue(newJourney());
    fakeWritableSupabase(savedRow, oldJourney);

    // when
    await refreshJourney(userId);
    await settle();

    // then
    expect(buildJourney).toHaveBeenCalledOnce();
  });
});
