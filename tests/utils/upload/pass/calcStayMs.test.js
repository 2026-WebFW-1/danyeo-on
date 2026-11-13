import { describe, expect, test } from 'vitest';

import { calcStayMs } from '@/utils/upload/pass/calcStayMs';

/** 일반 사진 count장. calcStayMs는 장 수만 봐요. */
function makePhotos(count) {
  return Array.from({ length: count }, (_, i) => ({ id: `${i}`, filename: `${i}.jpg` }));
}

// 속도 숫자는 화면 보면서 바뀔 수 있어서 크기 관계만 확인합니다.
describe('calcStayMs', () => {
  test('사진이 많을수록 빨리 지나가요', () => {
    // given: 150장, 300장
    const fewPhotos = makePhotos(150);
    const manyPhotos = makePhotos(300);

    // when
    const few = calcStayMs(fewPhotos);
    const many = calcStayMs(manyPhotos);

    // then
    expect(many).toBeLessThan(few);
  });

  test('사진이 아무리 많아도 정해진 빠르기보다 빨라지지 않아요', () => {
    // given: 300장, 3000장
    const manyPhotos = makePhotos(300);
    const tooManyPhotos = makePhotos(3000);

    // when
    const many = calcStayMs(manyPhotos);
    const tooMany = calcStayMs(tooManyPhotos);

    // then
    expect(tooMany).toBe(many);
  });

  test('사진이 아무리 적어도 정해진 시간보다 오래 머물지 않아요', () => {
    // given: 1장, 24장
    const onePhoto = makePhotos(1);
    const fewPhotos = makePhotos(24);

    // when
    const one = calcStayMs(onePhoto);
    const few = calcStayMs(fewPhotos);

    // then
    expect(one).toBe(few);
  });

  test('사진이 없어도 시간을 돌려줘요', () => {
    // given
    const photos = [];

    // when
    const stayMs = calcStayMs(photos);

    // then
    expect(stayMs).toBeGreaterThan(0);
  });
});
