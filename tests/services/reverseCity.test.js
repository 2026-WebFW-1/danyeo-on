import { describe, expect, test, vi } from 'vitest';

import { UNKNOWN_CITY, UNKNOWN_PLACE } from '@/constants/geocode';
import { createReverseCity, reverseCity as defaultReverseCity } from '@/services/reverseCity';

import samples from '../fixtures/geocode/nominatim.json';

const { responses } = samples;
const SEOUL = { city: '서울', country: '한국', cc: 'KR' };
const BUSAN = { city: '부산', country: '한국', cc: 'KR' };

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const queryOf = (url) => Object.fromEntries(new URL(url).searchParams);

// 시간을 실제로 기다리지 않고 숫자로만 흘려요.
function createClock() {
  let time = 1000;
  return {
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    advance: (ms) => {
      time += ms;
    },
  };
}

function setup({ fetchFn, ...options } = {}) {
  const clock = createClock();
  const fetchMock = vi.fn(fetchFn ?? (async () => jsonResponse(responses['서울'])));
  const reverseCity = createReverseCity({
    fetchFn: fetchMock,
    now: clock.now,
    sleep: clock.sleep,
    intervalMs: 100,
    timeoutMs: 30,
    failureLimit: 3,
    cooldownMs: 10_000,
    ...options,
  });
  return { reverseCity, fetchMock, clock };
}

// 서로 1km보다 멀리 떨어진 좌표들이에요(위도 0.1도는 약 11km).
const farPoints = [0, 1, 2, 3, 4, 5, 6].map((n) => [10 + n * 0.1, 20]);

describe('reverseCity: 이름 찾기', () => {
  test('응답을 { city, country, cc }로 바꿔서 돌려줘요', async () => {
    const { reverseCity, fetchMock } = setup();

    expect(await reverseCity(37.5579, 126.9207)).toEqual(SEOUL);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('https://nominatim.openstreetmap.org/reverse?');
    expect(queryOf(url)).toEqual({
      format: 'jsonv2',
      zoom: '10',
      addressdetails: '1',
      'accept-language': 'ko,en',
      lat: '37.558',
      lon: '126.921',
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test('서비스가 대한민국이라고 줘도 앱 표기(한국)로 돌려줘요', async () => {
    const { reverseCity } = setup();
    expect((await reverseCity(37.5579, 126.9207)).country).toBe('한국');
  });

  test('바다처럼 이름이 없는 응답은 이름 없는 곳이고 다시 묻지 않아요', async () => {
    const { reverseCity, fetchMock } = setup({
      fetchFn: async () => jsonResponse(responses['바다']),
    });

    expect(await reverseCity(0, 0)).toEqual(UNKNOWN_PLACE);
    expect(await reverseCity(0, 0)).toEqual(UNKNOWN_PLACE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('도시 이름은 비었지만 나라 코드가 있으면 나라는 남기고 다시 묻지 않아요', async () => {
    const body = { address: { country_code: 'ca', country: 'Canada' } };
    const { reverseCity, fetchMock } = setup({ fetchFn: async () => jsonResponse(body) });

    const expected = { city: UNKNOWN_CITY, country: '캐나다', cc: 'CA' };
    expect(await reverseCity(51.3, -116)).toEqual(expected);
    expect(await reverseCity(51.3, -116)).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('돌려받은 객체를 고쳐도 다음 결과가 바뀌지 않아요', async () => {
    const { reverseCity } = setup();

    const first = await reverseCity(37.5579, 126.9207);
    first.city = '고침';
    expect(await reverseCity(37.5579, 126.9207)).toEqual(SEOUL);
  });

  test('정확한 위치가 나가지 않게 좌표를 소수 3자리로 줄여서 보내요', async () => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(-33.8709, 151.2323);
    await reverseCity(89.9996, 179.9996);
    const [first, second] = fetchMock.mock.calls.map(([url]) => queryOf(url));
    expect(first).toMatchObject({ lat: '-33.871', lon: '151.232' });
    expect(second).toMatchObject({ lat: '90', lon: '180' });
  });

  test('좌표를 지수 표기 없이 적어요', async () => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(1e-7, -1e-7);
    const [url] = fetchMock.mock.calls[0];
    expect(queryOf(url)).toMatchObject({ lat: '0', lon: '0' });
  });
});

describe('reverseCity: 잘못된 좌표', () => {
  test.each([
    ['문자', '37.5', '127'],
    ['NaN', NaN, 127],
    ['Infinity', 37, Infinity],
    ['null', null, 127],
    ['undefined', undefined, undefined],
    ['위도가 90보다 큼', 90.001, 0],
    ['위도가 -90보다 작음', -90.001, 0],
    ['경도가 180보다 큼', 0, 180.001],
    ['경도가 -180보다 작음', 0, -180.001],
  ])('%s이면 요청 없이 이름 없는 곳이에요', async (_name, lat, lng) => {
    const { reverseCity, fetchMock } = setup();

    expect(await reverseCity(lat, lng)).toEqual(UNKNOWN_PLACE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    [90, 180],
    [-90, -180],
    [0, 0],
  ])('경계 좌표(%s, %s)는 요청해요', async (lat, lng) => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(lat, lng);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('reverseCity: 같은 곳 다시 쓰기', () => {
  test('같은 좌표를 두 번 부르면 요청은 한 번이에요', async () => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(37.5579, 126.9207);
    await reverseCity(37.5579, 126.9207);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('1km 안은 다시 쓰고 1km 밖은 새로 물어요', async () => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(37.5, 127); // 기준
    await reverseCity(37.508, 127); // 약 0.89km
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await reverseCity(37.511, 127); // 약 1.22km
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('처음 물은 곳만 기준이라, 1km씩 이어진 곳이 따라가며 퍼지지 않아요', async () => {
    const { reverseCity, fetchMock } = setup();

    await reverseCity(37.5, 127);
    await reverseCity(37.508, 127); // 기준에서 0.89km: 다시 씀(새 기준이 되지 않아요)
    await reverseCity(37.516, 127); // 기준에서 1.78km: 새로 물어요
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('1km 안에 기준이 둘이면 더 가까운 쪽 결과를 써요', async () => {
    const bodies = [responses['서울'], responses['부산']];
    const { reverseCity } = setup({ fetchFn: async () => jsonResponse(bodies.shift()) });

    await reverseCity(10, 20); // 서울 응답
    await reverseCity(10.012, 20); // 1.33km 떨어져서 새로 물음: 부산 응답
    expect(await reverseCity(10.007, 20)).toEqual(BUSAN); // 앞 기준 0.78km, 뒤 기준 0.56km
  });

  test('같은 곳을 동시에 물으면 요청 하나를 같이 기다려요', async () => {
    const { reverseCity, fetchMock } = setup();

    const results = await Promise.all([
      reverseCity(37.5579, 126.9207),
      reverseCity(37.5579, 126.9207),
      reverseCity(37.558, 126.9208),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual([SEOUL, SEOUL, SEOUL]);
  });
});

describe('reverseCity: 요청 순서와 간격', () => {
  test('기본 간격은 공개 서버의 제한(1초에 한 번)보다 길어요', async () => {
    const clock = createClock();
    const startedAt = [];
    const reverseCity = createReverseCity({
      fetchFn: async () => {
        startedAt.push(clock.now());
        return jsonResponse(responses['서울']);
      },
      now: clock.now,
      sleep: clock.sleep,
    });

    await Promise.all(farPoints.slice(0, 3).map(([lat, lng]) => reverseCity(lat, lng)));

    expect(startedAt).toHaveLength(3);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThan(1000);
    expect(startedAt[2] - startedAt[1]).toBeGreaterThan(1000);
  });

  test('서로 다른 곳을 동시에 물어도 한 번에 하나씩, 간격을 두고 보내요', async () => {
    let running = 0;
    let maxRunning = 0;
    const startedAt = [];
    const clock = createClock();
    const fetchFn = async () => {
      startedAt.push(clock.now());
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await Promise.resolve();
      running -= 1;
      return jsonResponse(responses['서울']);
    };
    const reverseCity = createReverseCity({
      fetchFn,
      now: clock.now,
      sleep: clock.sleep,
      intervalMs: 100,
    });

    await Promise.all(farPoints.slice(0, 4).map(([lat, lng]) => reverseCity(lat, lng)));

    expect(startedAt).toHaveLength(4);
    expect(maxRunning).toBe(1);
    for (let i = 1; i < startedAt.length; i += 1) {
      expect(startedAt[i] - startedAt[i - 1]).toBeGreaterThanOrEqual(100);
    }
  });

  test('요청이 간격보다 오래 걸렸으면 더 기다리지 않아요', async () => {
    const clock = createClock();
    const sleep = vi.fn(clock.sleep);
    const reverseCity = createReverseCity({
      fetchFn: async () => {
        clock.advance(500);
        return jsonResponse(responses['서울']);
      },
      now: clock.now,
      sleep,
      intervalMs: 100,
    });

    await reverseCity(...farPoints[0]);
    await reverseCity(...farPoints[1]);
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('reverseCity: 실패하면 이름 없는 곳이고 캐시하지 않아요', () => {
  test.each([
    [
      '네트워크 오류',
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ],
    ['HTTP 500', async () => jsonResponse({}, 500)],
    [
      'HTTP 429(요청이 너무 많음, 본문은 HTML)',
      async () => ({
        ok: false,
        status: 429,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }),
    ],
    ['HTTP 403(접근 막힘)', async () => jsonResponse({}, 403)],
    [
      '응답 글이 JSON이 아님',
      async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }),
    ],
    ['JSON이 null', async () => jsonResponse(null)],
    ['address 칸이 없는 응답', async () => jsonResponse({ name: '서울' })],
    [
      'HTTP 200인데 오류 객체',
      async () => jsonResponse({ error: { code: 400, message: 'Bad Request' } }),
    ],
    [
      'fetch가 바로 던짐',
      () => {
        throw new Error('boom');
      },
    ],
  ])('%s', async (_name, fetchFn) => {
    const { reverseCity, fetchMock } = setup({ fetchFn });

    expect(await reverseCity(37.5579, 126.9207)).toEqual(UNKNOWN_PLACE);
    expect(await reverseCity(37.5579, 126.9207)).toEqual(UNKNOWN_PLACE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('시간이 넘으면 요청을 끊고, 다음에 다시 물어요', async () => {
    const signals = [];
    const { reverseCity, fetchMock } = setup({
      fetchFn: (_url, { signal }) => {
        signals.push(signal);
        return new Promise(() => {});
      },
    });

    expect(await reverseCity(37.5579, 126.9207)).toEqual(UNKNOWN_PLACE);
    expect(signals[0].aborted).toBe(true);

    expect(await reverseCity(37.5579, 126.9207)).toEqual(UNKNOWN_PLACE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('실패한 요청을 같이 기다린 쪽도 이름 없는 곳을 받고, 그 뒤에 다시 물으면 새로 요청해요', async () => {
    const outcomes = [() => jsonResponse({}, 500), () => jsonResponse(responses['서울'])];
    const { reverseCity, fetchMock } = setup({ fetchFn: async () => outcomes.shift()() });

    const shared = await Promise.all([reverseCity(37.5, 127), reverseCity(37.5, 127)]);
    expect(shared).toEqual([UNKNOWN_PLACE, UNKNOWN_PLACE]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(await reverseCity(37.5, 127)).toEqual(SEOUL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('reverseCity: 서비스가 계속 실패할 때', () => {
  const failing = async () => jsonResponse({}, 500);

  test('한꺼번에 물어도 연달아 3번 실패하면 나머지는 요청하지 않아요', async () => {
    const { reverseCity, fetchMock } = setup({ fetchFn: failing });

    const results = await Promise.all(farPoints.map(([lat, lng]) => reverseCity(lat, lng)));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(results).toEqual(farPoints.map(() => UNKNOWN_PLACE));
  });

  test('쉬는 동안에도 이미 아는 곳은 그대로 돌려줘요', async () => {
    const outcomes = [() => jsonResponse(responses['서울']), failing, failing, failing];
    const { reverseCity } = setup({ fetchFn: async () => outcomes.shift()() });

    await reverseCity(...farPoints[0]); // 성공: 캐시
    for (const [lat, lng] of farPoints.slice(1, 4)) await reverseCity(lat, lng); // 3번 실패: 쉬기 시작
    expect(await reverseCity(...farPoints[0])).toEqual(SEOUL);
  });

  test('쉬는 시간이 지나면 한 번 시험해 보고, 성공하면 다시 정상이에요', async () => {
    const outcomes = [failing, failing, failing, () => jsonResponse(responses['서울'])];
    const { reverseCity, fetchMock, clock } = setup({
      fetchFn: async () => (outcomes.shift() ?? (() => jsonResponse(responses['서울'])))(),
    });

    for (const [lat, lng] of farPoints.slice(0, 3)) await reverseCity(lat, lng);
    await reverseCity(...farPoints[3]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    clock.advance(10_000);
    expect(await reverseCity(...farPoints[4])).toEqual(SEOUL);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(await reverseCity(...farPoints[5])).toEqual(SEOUL);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('시험 요청도 실패하면 다시 쉬어요', async () => {
    const { reverseCity, fetchMock, clock } = setup({ fetchFn: failing });

    for (const [lat, lng] of farPoints.slice(0, 3)) await reverseCity(lat, lng);
    clock.advance(10_000);
    await reverseCity(...farPoints[3]);
    await reverseCity(...farPoints[4]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('실패 사이에 성공이 끼면 실패 횟수를 처음부터 세요', async () => {
    const outcomes = [failing, failing, () => jsonResponse(responses['서울']), failing, failing];
    const { reverseCity, fetchMock } = setup({ fetchFn: async () => outcomes.shift()() });

    for (const [lat, lng] of farPoints.slice(0, 5)) await reverseCity(lat, lng);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('바다처럼 이름이 없는 정상 응답은 실패로 세지 않아요', async () => {
    const { reverseCity, fetchMock } = setup({
      fetchFn: async () => jsonResponse(responses['바다']),
    });

    for (const [lat, lng] of farPoints) await reverseCity(lat, lng);
    expect(fetchMock).toHaveBeenCalledTimes(farPoints.length);
  });
});

describe('reverseCity 기본값', () => {
  test('불러올 때는 요청하지 않고, 함수로 쓸 수 있어요', () => {
    expect(defaultReverseCity).toBeTypeOf('function');
  });
});
