import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { clearMyPhotos, getMyPhotos } from '@/services/myPhotosService';
import { getMyData } from '@/services/photoService';

vi.mock('@/services/photoService', () => ({ getMyData: vi.fn() }));

const photosOf = (ownerId, ids) =>
  ids.map((id) => ({ id, ownerId, fileKey: `public:/photos/${id}.webp` }));

beforeEach(() => clearMyPhotos());
afterEach(() => vi.resetAllMocks());

describe('getMyPhotos', () => {
  test('내 데이터 중 사진만 돌려줘요', async () => {
    vi.mocked(getMyData).mockResolvedValue({ photos: photosOf('u1', ['a', 'b']), posts: [] });

    await expect(getMyPhotos('u1')).resolves.toEqual(photosOf('u1', ['a', 'b']));
  });

  test('같은 계정은 한 번만 읽고 같은 배열을 줘요', async () => {
    vi.mocked(getMyData).mockResolvedValue({ photos: photosOf('u1', ['a']) });

    const first = await getMyPhotos('u1');
    const second = await getMyPhotos('u1');

    expect(second).toBe(first);
    expect(getMyData).toHaveBeenCalledTimes(1);
  });

  test('동시에 불러도 한 번만 읽어요', async () => {
    vi.mocked(getMyData).mockResolvedValue({ photos: photosOf('u1', ['a']) });

    const [first, second] = await Promise.all([getMyPhotos('u1'), getMyPhotos('u1')]);

    expect(second).toBe(first);
    expect(getMyData).toHaveBeenCalledTimes(1);
  });

  test('다른 계정은 따로 읽어요', async () => {
    vi.mocked(getMyData)
      .mockResolvedValueOnce({ photos: photosOf('u1', ['a']) })
      .mockResolvedValueOnce({ photos: photosOf('u2', ['b']) });

    const mine = await getMyPhotos('u1');
    const other = await getMyPhotos('u2');

    expect(mine[0].id).toBe('a');
    expect(other[0].id).toBe('b');
    expect(getMyData).toHaveBeenCalledTimes(2);
  });

  test('실패하면 status 0과 LOAD_FAILED로 거절하고, 다음에 다시 읽어요', async () => {
    vi.mocked(getMyData)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ photos: photosOf('u1', ['a']) });

    await expect(getMyPhotos('u1')).rejects.toEqual({
      status: 0,
      code: 'LOAD_FAILED',
      message: 'network down',
    });
    await expect(getMyPhotos('u1')).resolves.toHaveLength(1);
    expect(getMyData).toHaveBeenCalledTimes(2);
  });

  test('읽는 사이에 다른 사람의 사진이 왔으면 버리고 다음에 다시 읽어요', async () => {
    vi.mocked(getMyData)
      .mockResolvedValueOnce({ photos: photosOf('u2', ['b']) })
      .mockResolvedValueOnce({ photos: photosOf('u1', ['a']) });

    await expect(getMyPhotos('u1')).rejects.toMatchObject({ code: 'ACCOUNT_CHANGED' });
    await expect(getMyPhotos('u1')).resolves.toEqual(photosOf('u1', ['a']));
  });

  test('사진이 하나도 없는 계정도 빈 배열로 읽어요', async () => {
    vi.mocked(getMyData).mockResolvedValue({ photos: [] });

    await expect(getMyPhotos('u1')).resolves.toEqual([]);
  });

  test('clearMyPhotos 뒤에는 다시 읽어요', async () => {
    vi.mocked(getMyData).mockResolvedValue({ photos: photosOf('u1', ['a']) });

    await getMyPhotos('u1');
    clearMyPhotos();
    await getMyPhotos('u1');

    expect(getMyData).toHaveBeenCalledTimes(2);
  });
});
