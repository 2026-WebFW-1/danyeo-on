import { describe, expect, test } from 'vitest';

import { groupDemoFileNames, pickCoverageCredits, pickLocalCredits } from '@/utils/photoCredits';

const SEOJIN = 'd0000000-0000-4000-8000-000000000001/seojin';

describe('groupDemoFileNames', () => {
  test('demo: 사진은 폴더별로, public: 사진은 따로 모으고 올린 사진 · 빈 사진은 빼요', () => {
    const { demo, local } = groupDemoFileNames([
      `demo:${SEOJIN}/commons-1.webp`,
      `demo:${SEOJIN}/tokyo-1.webp`,
      `demo:${SEOJIN}/commons-1.webp`,
      'public:/photos/busan-2.webp',
      'photos:u1/p_1',
      null,
    ]);

    expect([...demo]).toEqual([[SEOJIN, new Set(['commons-1.webp', 'tokyo-1.webp'])]]);
    expect([...local]).toEqual(['busan-2.webp']);
  });

  test('모양이 다른 demo: 키는 무시해요', () => {
    const { demo } = groupDemoFileNames(['demo:only-two/parts', 'demo:a//c.webp']);

    expect(demo.size).toBe(0);
  });
});

describe('pickCoverageCredits', () => {
  const coverage = {
    assets: [
      {
        title: 'File:August 2007, Seoul at dawn.jpg',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Seoul.jpg',
        author: 'Ken Eckert\n\n This photo was taken with Canon PowerShot G10',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        filename: 'commons-1.webp',
      },
      { title: 'File:Unused.jpg', author: 'A', license: 'CC0', filename: 'commons-9.webp' },
    ],
  };

  test('쓰는 사진만 골라 제목의 File: · 확장자와 저작자의 덧붙임 줄을 떼요', () => {
    expect(pickCoverageCredits(coverage, new Set(['commons-1.webp']))).toEqual([
      {
        fileName: 'commons-1.webp',
        title: 'August 2007, Seoul at dawn',
        author: 'Ken Eckert',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Seoul.jpg',
      },
    ]);
  });

  test('라이선스 주소가 없으면 아는 라이선스의 주소를 붙이고, 모르면 null이에요', () => {
    const [cc0] = pickCoverageCredits(coverage, new Set(['commons-9.webp']));
    const [publicDomain] = pickCoverageCredits(
      {
        assets: [{ title: 'File:A.jpg', author: 'NASA', license: 'Public domain', filename: 'a' }],
      },
      new Set(['a']),
    );

    expect(cc0.licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
    expect(publicDomain).toMatchObject({ licenseUrl: null, sourceUrl: null });
  });
});

describe('pickLocalCredits', () => {
  test('저작자와 라이선스가 적힌 사진만 골라요', () => {
    const localCredits = {
      danang: [
        {
          file: '/photos/full/danang-4.webp',
          title: 'Golden Bridge, Ba Na Hills',
          artist: 'DvTor8303',
          license: 'CC0',
          source: 'https://commons.wikimedia.org/wiki/File:Golden_Bridge.jpg',
        },
      ],
      busan: [{ file: '/photos/full/busan-1.webp', title: 'Haeundae Beach' }],
    };

    expect(pickLocalCredits(localCredits, new Set(['danang-4.webp', 'busan-1.webp']))).toEqual([
      {
        fileName: 'danang-4.webp',
        title: 'Golden Bridge, Ba Na Hills',
        author: 'DvTor8303',
        license: 'CC0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Golden_Bridge.jpg',
      },
    ]);
  });
});
