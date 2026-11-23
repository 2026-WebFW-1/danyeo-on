import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { getPhotoCredits } from '@/services/creditService';

const BASE = 'https://demo.supabase.test';
const LOCAL_URL = '/photos/credits.json';

// 서비스가 받은 파일을 주소로 기억해서, 테스트마다 다른 폴더를 써요.
let folder;
let folderCount = 0;
const coverageUrl = () =>
  `${BASE}/storage/v1/object/public/demo-assets/${folder}/coverage-credits.json`;

const COVERAGE = {
  assets: [
    { title: 'File:Seoul.jpg', author: 'Syced', license: 'CC0', filename: 'commons-1.webp' },
    { title: 'File:Busan.jpg', author: 'Ken', license: 'CC BY 4.0', filename: 'commons-2.webp' },
  ],
};
const LOCAL = {
  danang: [
    { file: '/photos/full/danang-4.webp', title: 'Golden Bridge', artist: 'Dv', license: 'CC0' },
  ],
  tokyo: [{ file: '/photos/full/tokyo-1.webp', title: 'Tokyo' }],
};

let fetchMock;

function respondWith(files) {
  fetchMock.mockImplementation(async (url) =>
    url in files
      ? { ok: true, status: 200, json: async () => files[url] }
      : { ok: false, status: 400, json: async () => ({}) },
  );
}

beforeEach(() => {
  folderCount += 1;
  folder = `owner-${folderCount}/seojin`;
  vi.stubEnv('VITE_SUPABASE_URL', `${BASE}/`);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('직접 올린 사진만 있으면 요청하지 않고 빈 배열이에요', async () => {
  expect(await getPhotoCredits(['photos:u1/p_1', null])).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('추가 사진은 Storage의 출처 파일에서 찾아 제목 순서로 줘요', async () => {
  respondWith({ [coverageUrl()]: COVERAGE });

  const credits = await getPhotoCredits([
    `demo:${folder}/commons-1.webp`,
    `demo:${folder}/commons-2.webp`,
  ]);

  expect(credits.map((credit) => [credit.title, credit.author])).toEqual([
    ['Busan', 'Ken'],
    ['Seoul', 'Syced'],
  ]);
  expect(fetchMock.mock.calls).toEqual([[coverageUrl()]]);
});

test('거기 없는 사진은 앱의 출처 파일에서 찾고, 출처가 안 적힌 사진은 빠져요', async () => {
  respondWith({ [coverageUrl()]: COVERAGE, [LOCAL_URL]: LOCAL });

  const credits = await getPhotoCredits([
    `demo:${folder}/commons-1.webp`,
    `demo:${folder}/danang-4.webp`,
    `demo:${folder}/tokyo-1.webp`,
  ]);

  expect(credits.map((credit) => credit.fileName)).toEqual(['danang-4.webp', 'commons-1.webp']);
});

test('같은 파일은 한 번만 받아요', async () => {
  respondWith({ [coverageUrl()]: COVERAGE });

  await getPhotoCredits([`demo:${folder}/commons-1.webp`]);
  await getPhotoCredits([`demo:${folder}/commons-2.webp`]);

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('파일을 받지 못하면 오류를 던지고, 다음에는 다시 받아요', async () => {
  respondWith({});
  await expect(getPhotoCredits([`demo:${folder}/commons-1.webp`])).rejects.toThrow('400');

  respondWith({ [coverageUrl()]: COVERAGE });
  expect(await getPhotoCredits([`demo:${folder}/commons-1.webp`])).toHaveLength(1);
});
