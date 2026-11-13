import { describe, expect, test } from 'vitest';

import { calcStayMs } from '@/utils/upload/pass/calcStayMs';

/** 이름만 다른 사진 줄. calcStayMs는 filename만 봐요 */
function makePhotos(filenames) {
  return filenames.map((filename) => ({
    id: filename,
    filename,
  }));
}

// 속도 숫자는 화면 보면서 바뀔 수 있어서 크기 관계만 확인합니다.
describe('calcStayMs', () => {
  test('편집본은 바로 옆 사진보다 느리게 지나갑니다.', () => {
    // given: 가운데(2번)만 편집본
    const photos = makePhotos(['a.jpg', 'b.jpg', 'c-edited.jpg', 'd.jpg', 'e.jpg']);

    // when
    const edited = calcStayMs(photos, 2);
    const between = calcStayMs(photos, 1);

    // then
    expect(edited).toBeGreaterThan(between);
  });

  test('편집본 바로 옆은 먼 사진보다 느리게 지나갑니다.', () => {
    // given: 끝(2번)만 편집본
    const photos = makePhotos(['a.jpg', 'b.jpg', 'c-edited.jpg']);

    // when
    const between = calcStayMs(photos, 1);
    const far = calcStayMs(photos, 0);

    // then
    expect(between).toBeGreaterThan(far);
  });

  test('편집본 앞과 뒤는 같은 빠르기예요', () => {
    // given: 가운데(2번)만 편집본
    const photos = makePhotos(['a.jpg', 'b.jpg', 'c-edited.jpg', 'd.jpg', 'e.jpg']);

    // when
    const before = calcStayMs(photos, 1);
    const after = calcStayMs(photos, 3);

    // then
    expect(before).toBe(after);
  });

  test('맨 앞과 맨 뒤의 일반 사진은 같은 빠르기예요', () => {
    // given: 가운데(2번)만 편집본이라 양 끝은 앞이나 뒤 자리가 비어 있음
    const photos = makePhotos(['a.jpg', 'b.jpg', 'c-edited.jpg', 'd.jpg', 'e.jpg']);

    // when
    const first = calcStayMs(photos, 0);
    const last = calcStayMs(photos, 4);

    // then
    expect(first).toBe(last);
  });

  test.each(['a.jpg', 'a-edited.jpg'])('사진이 %s 한 장뿐이어도 시간을 돌려줘요', (filename) => {
    // given: 앞뒤가 모두 줄 밖
    const photos = makePhotos([filename]);

    // when
    const stayMs = calcStayMs(photos, 0);

    // then
    expect(stayMs).toBeGreaterThan(0);
  });

  test('사진이 많을수록 일반 사진이 빨리 지나가요', () => {
    // given: 일반 사진만 24장, 300장
    const fewPhotos = makePhotos(Array.from({ length: 24 }, (_, i) => `${i}.jpg`));
    const manyPhotos = makePhotos(Array.from({ length: 300 }, (_, i) => `${i}.jpg`));

    // when
    const few = calcStayMs(fewPhotos, 0);
    const many = calcStayMs(manyPhotos, 0);

    // then
    expect(many).toBeLessThan(few);
  });

  test('사진이 아무리 많아도 일반 사진이 정해진 빠르기보다 빨라지지 않아요', () => {
    // given: 일반 사진만 300장, 3000장
    const manyPhotos = makePhotos(Array.from({ length: 300 }, (_, i) => `${i}.jpg`));
    const tooManyPhotos = makePhotos(Array.from({ length: 3000 }, (_, i) => `${i}.jpg`));

    // when
    const many = calcStayMs(manyPhotos, 0);
    const tooMany = calcStayMs(tooManyPhotos, 0);

    // then
    expect(tooMany).toBe(many);
  });

  test('사진이 많아도 편집본 바로 옆은 일반 사진보다 느려요', () => {
    // given: 300장 중 가운데(150번)만 편집본
    const filenames = Array.from({ length: 300 }, (_, i) => `${i}.jpg`);
    filenames[150] = '150-edited.jpg';
    const photos = makePhotos(filenames);

    // when
    const beside = calcStayMs(photos, 149);
    const far = calcStayMs(photos, 0);

    // then
    expect(beside).toBeGreaterThan(far);
  });
});
