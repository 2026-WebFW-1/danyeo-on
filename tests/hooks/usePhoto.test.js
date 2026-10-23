import { describe, expect, test } from 'vitest';

import edgeSeed from '@/data/seed/edge.json';
import seojinSeed from '@/data/seed/seojin.json';
import { photoSource } from '@/hooks/usePhoto';

describe('photoSource', () => {
  test('크기를 안 주면 full 주소예요', () => {
    expect(photoSource('public:/photos/tokyo-1.webp')).toBe('/photos/full/tokyo-1.webp');
  });

  test('thumb를 주면 썸네일 주소예요', () => {
    expect(photoSource('public:/photos/tokyo-1.webp', 'thumb')).toBe('/photos/thumb/tokyo-1.webp');
  });

  test.each([null, undefined, '', 'idb:p_c2a066'])('%s는 지원하지 않아 null이에요', (fileKey) => {
    expect(photoSource(fileKey)).toBeNull();
  });
});

describe('시연용 사진 파일', () => {
  const fileKeys = [...edgeSeed.photos, ...seojinSeed.photos]
    .map((photo) => photo.fileKey)
    .filter(Boolean);

  test('seed의 fileKey는 모두 .webp예요', () => {
    expect(fileKeys.filter((key) => !key.endsWith('.webp'))).toEqual([]);
  });

  test('seed가 가리키는 사진마다 full·thumb 두 벌이 실제로 있어요', async () => {
    const urls = [...new Set(fileKeys)].flatMap((key) => [
      photoSource(key, 'full'),
      photoSource(key, 'thumb'),
    ]);
    const missing = [];
    for (const url of urls) {
      // 없는 주소도 개발 서버가 index.html로 200을 줄 수 있어서 형식까지 봐요
      const response = await fetch(url, { method: 'HEAD' });
      if (response.headers.get('content-type') !== 'image/webp') missing.push(url);
    }
    expect(missing).toEqual([]);
  });
});
