import { describe, expect, test } from 'vitest';

import { getFixtureJourney, personaOf } from '@/services/journeyService';

const userWith = (email) => ({ id: 'd0000000-0000-4000-8000-000000000001', email, name: '이름' });

describe('personaOf', () => {
  test.each([
    ['seojin@demo.local', 'seojin'],
    ['edge@demo.local', 'edge'],
    ['empty@demo.local', 'empty'],
    ['heavy@demo.local', 'heavy'],
  ])('데모 계정 %s는 %s예요', (email, persona) => {
    expect(personaOf(userWith(email))).toBe(persona);
  });

  test.each(['me@gmail.com', 'Seojin@demo.local', 'seojin2@demo.local', 'seojin@demo.local.kr'])(
    '데모 계정이 아닌 %s는 empty예요',
    (email) => {
      expect(personaOf(userWith(email))).toBe('empty');
    },
  );

  test('로그인 전(null)이면 null이에요', () => {
    expect(personaOf(null)).toBeNull();
  });
});

describe('getFixtureJourney', () => {
  test('seojin: 설명용 칸이 없고 지점 19 · 구간 33 · 여행 14, 기준일 2026-08-16', async () => {
    const journey = await getFixtureJourney('seojin');

    expect(journey).not.toHaveProperty('personaId');
    expect(journey).not.toHaveProperty('generatedBy');
    expect(journey).not.toHaveProperty('about');
    expect([journey.stops.length, journey.legs.length, journey.trips.length]).toEqual([19, 33, 14]);
    expect(journey.periods.anchor).toBe('2026-08-16');
  });

  test('edge: 지점 15', async () => {
    const journey = await getFixtureJourney('edge');

    expect(journey.stops).toHaveLength(15);
  });

  test('empty: 배열이 비고 periods는 null이에요', async () => {
    const journey = await getFixtureJourney('empty');

    expect([journey.stops, journey.legs, journey.trips]).toEqual([[], [], []]);
    expect(journey.periods).toBeNull();
  });

  test('fixture가 없는 인물은 NOT_FOUND로 거절해요', async () => {
    await expect(getFixtureJourney('foo')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('같은 인물을 동시에 두 번 불러도 같은 객체예요', async () => {
    const [first, second] = await Promise.all([
      getFixtureJourney('edge'),
      getFixtureJourney('edge'),
    ]);

    expect(first).toBe(second);
  });
});
