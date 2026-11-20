import { afterEach, describe, expect, test, vi } from 'vitest';

import { clearDraft, isDraftNewer, readDraft, writeDraft } from '@/utils/postDraft';

const DATE = '2025-07-12';
const form = { title: '제목', body: '본문', tags: ['밴쿠버'], photoIds: ['p_a'] };

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('readDraft · writeDraft · clearDraft', () => {
  test('쓴 임시본을 같은 계정·날짜로 읽어요', () => {
    writeDraft('u1', DATE, form);

    const draft = readDraft('u1', DATE);
    expect(draft).toEqual({ ...form, savedAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(draft.savedAt))).toBe(false);
  });

  test('다른 계정이나 다른 날짜로는 안 보여요', () => {
    writeDraft('u1', DATE, form);

    expect(readDraft('u2', DATE)).toBeNull();
    expect(readDraft('u1', '2025-07-13')).toBeNull();
  });

  test('지우면 사라져요', () => {
    writeDraft('u1', DATE, form);

    clearDraft('u1', DATE);

    expect(readDraft('u1', DATE)).toBeNull();
  });

  test.each(['{', '"x"', 'null', '{"title":"a"}'])('깨진 값(%s)이면 null이에요', (raw) => {
    localStorage.setItem(`post-draft:u1:${DATE}`, raw);

    expect(readDraft('u1', DATE)).toBeNull();
  });

  test('저장소가 오류를 던져도 던지지 않아요', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    expect(() => writeDraft('u1', DATE, form)).not.toThrow();
    expect(readDraft('u1', DATE)).toBeNull();
    expect(() => clearDraft('u1', DATE)).not.toThrow();
  });
});

describe('isDraftNewer', () => {
  const post = { updatedAt: '2025-07-12T10:00:00Z' };

  test('서버 글보다 나중에 보관했으면 true예요', () => {
    expect(isDraftNewer({ ...form, savedAt: '2025-07-12T11:00:00Z' }, post)).toBe(true);
  });

  test('서버 글보다 먼저 보관했으면 false예요', () => {
    expect(isDraftNewer({ ...form, savedAt: '2025-07-12T09:00:00Z' }, post)).toBe(false);
  });

  test('서버에 글이 없으면 true예요', () => {
    expect(isDraftNewer({ ...form, savedAt: '2025-07-12T09:00:00Z' }, undefined)).toBe(true);
  });
});
