import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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

describe('Supabase 공개 데모 사진', () => {
  const base = 'https://photos.example.supabase.co';
  const fileKey = 'demo:d0000000-0000-4000-8000-000000000001/seojin/city.webp';

  beforeEach(() => vi.stubEnv('VITE_SUPABASE_URL', `${base}/`));
  afterEach(() => vi.unstubAllEnvs());

  test.each(['full', 'thumb'])('%s 주소는 세션이나 API 키 없이 만들어요', (size) => {
    expect(photoSource(fileKey, size)).toBe(
      `${base}/storage/v1/object/public/demo-assets/d0000000-0000-4000-8000-000000000001/seojin/${size}/city.webp`,
    );
  });

  test('파일명은 URL 경로에 맞게 인코딩해요', () => {
    expect(photoSource(fileKey.replace('city.webp', 'city #1.webp'))).toContain(
      '/full/city%20%231.webp',
    );
  });

  test.each([
    'demo:',
    'demo:owner/person',
    'demo:owner/../city.webp',
    'demo:owner/person/full/city.webp',
  ])('잘못된 키 %s는 주소를 만들지 않아요', (key) => expect(photoSource(key)).toBeNull());

  test('프로젝트 주소가 없으면 null이에요', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(photoSource(fileKey)).toBeNull();
  });

  test('seed의 모든 새 Storage 키를 두 크기의 주소로 바꿀 수 있어요', () => {
    const keys = [...edgeSeed.photos, ...seojinSeed.photos]
      .map((photo) => photo.fileKey)
      .filter((key) => key?.startsWith('demo:'));
    expect(keys).toHaveLength(478);
    for (const key of keys) {
      for (const size of ['full', 'thumb']) {
        const path = key.slice('demo:'.length);
        const slash = path.lastIndexOf('/');
        expect(photoSource(key, size)).toBe(
          `${base}/storage/v1/object/public/demo-assets/${path.slice(0, slash)}/${size}${path.slice(slash)}`,
        );
      }
    }
  });
});

describe('시연용 사진 파일', () => {
  const fileKeys = [...edgeSeed.photos, ...seojinSeed.photos]
    .map((photo) => photo.fileKey)
    .filter(Boolean);

  test('seed의 fileKey는 모두 .webp예요', () => {
    expect(fileKeys.filter((key) => !key.endsWith('.webp'))).toEqual([]);
  });

  test('로컬 seed 사진마다 full·thumb 두 벌이 실제로 있어요', async () => {
    // Storage 파일 실재 검증은 BE 검증 절차로 한다. CI는 외부 서버에 의존하지 않는다.
    const urls = [...new Set(fileKeys.filter((key) => key.startsWith('public:')))].flatMap(
      (key) => [photoSource(key, 'full'), photoSource(key, 'thumb')],
    );
    const missing = [];
    for (const url of urls) {
      // 없는 주소도 개발 서버가 index.html로 200을 줄 수 있어서 형식까지 봐요
      const response = await fetch(url, { method: 'HEAD' });
      if (response.headers.get('content-type') !== 'image/webp') missing.push(url);
    }
    expect(missing).toEqual([]);
  });
});
