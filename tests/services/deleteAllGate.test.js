import { afterEach, describe, expect, test, vi } from 'vitest';

import { addCorrection, moveCorrectionPhoto, removeCorrection } from '@/services/correctionService';
import {
  assertNotDeletingAll,
  beginDeleteAll,
  getDeleteAllEpoch,
  guardWrite,
  isDeletingAll,
} from '@/services/deleteAllGate';
import { getSupabase } from '@/services/getSupabase';
import { saveJourney } from '@/services/journeyService';
import { deletePhotos, savePhotoImage, savePhotos } from '@/services/photoService';
import { removePost, savePost } from '@/services/postService';

vi.mock('@/services/getSupabase', () => ({ getSupabase: vi.fn() }));

const DELETING_ALL = { status: 0, code: 'DELETING_ALL', message: '사진을 모두 지우는 중이에요' };

afterEach(() => vi.resetAllMocks());

describe('beginDeleteAll', () => {
  test('시작하면 지우는 중이고, 끝났다고 알리면 풀려요', async () => {
    // given
    const endDelete = await beginDeleteAll();

    // when
    const during = isDeletingAll();
    endDelete();

    // then
    expect(during).toBe(true);
    expect(isDeletingAll()).toBe(false);
  });

  test('시작할 때와 끝날 때 번호를 올려요', async () => {
    // given
    const before = getDeleteAllEpoch();

    // when
    const endDelete = await beginDeleteAll();
    const during = getDeleteAllEpoch();
    endDelete();

    // then
    expect(during).toBe(before + 1);
    expect(getDeleteAllEpoch()).toBe(before + 2);
  });

  test('끝났다고 두 번 알려도 한 번만 반영해서, 다른 지우기가 남아 있으면 계속 지우는 중이에요', async () => {
    // given
    const endFirst = await beginDeleteAll();
    const endSecond = await beginDeleteAll();

    // when
    endFirst();
    endFirst();

    // then
    expect(isDeletingAll()).toBe(true);
    endSecond();
    expect(isDeletingAll()).toBe(false);
  });
});

describe('assertNotDeletingAll', () => {
  test('지우는 중이 아니면 던지지 않아요', () => {
    expect(() => assertNotDeletingAll()).not.toThrow();
  });

  test('지우는 중이면 DELETING_ALL로 던져요', async () => {
    // given
    const endDelete = await beginDeleteAll();

    // when
    const assert = () => assertNotDeletingAll();

    // then
    expect(assert).toThrow(expect.objectContaining({ code: 'DELETING_ALL' }));
    endDelete();
  });
});

describe('guardWrite', () => {
  function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  test('지우는 중이 아니면 감싼 쓰기를 그대로 실행하고 결과를 돌려줘요', async () => {
    // given
    const write = vi.fn(async (a, b) => a + b);

    // when
    const result = await guardWrite(write)(1, 2);

    // then
    expect(result).toBe(3);
    expect(write).toHaveBeenCalledWith(1, 2);
  });

  test('지우기는 이미 보내는 중인 쓰기가 끝날 때까지 기다렸다가 시작해요', async () => {
    // given
    const sending = deferred();
    const writing = guardWrite(() => sending.promise)();
    let started = false;

    // when
    const beginning = beginDeleteAll().then((end) => {
      started = true;
      return end;
    });
    await Promise.resolve();

    // then
    expect(started).toBe(false);
    expect(isDeletingAll()).toBe(true);
    sending.resolve('saved');
    await expect(writing).resolves.toBe('saved');
    const endDelete = await beginning;
    expect(started).toBe(true);
    endDelete();
  });

  test('보내는 중인 쓰기가 실패해도 지우기는 시작해요', async () => {
    // given
    const sending = deferred();
    const writing = guardWrite(() => sending.promise)();

    // when
    const beginning = beginDeleteAll();
    sending.reject(new Error('offline'));

    // then
    await expect(writing).rejects.toThrow('offline');
    const endDelete = await beginning;
    endDelete();
    expect(isDeletingAll()).toBe(false);
  });
});

describe('지우는 중에는 쓰기 서비스가 요청을 보내지 않고 거절해요', () => {
  const writes = {
    savePhotos: () => savePhotos([]),
    deletePhotos: () => deletePhotos(['p_a']),
    savePhotoImage: () => savePhotoImage('photos:u1/p_a', { full: new Blob(), thumb: new Blob() }),
    addCorrection: () => addCorrection({ id: 'c_1', type: 'exclude', photoId: 'p_a' }),
    removeCorrection: () => removeCorrection('c_1'),
    moveCorrectionPhoto: () => moveCorrectionPhoto('c_1', 'p_a', 'p_b'),
    savePost: () => savePost({ id: 'post_1' }),
    removePost: () => removePost('post_1'),
    saveJourney: () => saveJourney('u1', {}),
  };

  test.each(Object.entries(writes))('%s', async (name, write) => {
    // given
    const endDelete = await beginDeleteAll();

    // when
    const writing = write();

    // then
    await expect(writing).rejects.toEqual(DELETING_ALL);
    expect(getSupabase).not.toHaveBeenCalled();
    endDelete();
  });
});
