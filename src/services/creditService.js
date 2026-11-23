import { COVERAGE_CREDITS_FILE, LOCAL_CREDITS_URL } from '@/constants/credits';
import { groupDemoFileNames, pickCoverageCredits, pickLocalCredits } from '@/utils/photoCredits';

// 출처 파일은 바뀌지 않아서 주소마다 한 번만 받아요. 실패한 요청은 기억하지 않아요.
const cache = new Map();

function readJson(url) {
  if (!cache.has(url)) {
    const request = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`출처 파일을 받지 못했어요(${response.status}): ${url}`);
      return response.json();
    });
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return cache.get(url);
}

// 공개 버킷이라 주소만 조합해요. 로그인 세션 · API 키는 필요하지 않아요(usePhoto의 demo: 주소와 같아요).
function toCoverageUrl(folder) {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) throw new Error('VITE_SUPABASE_URL이 없어 데모 사진 출처를 읽을 수 없어요.');
  const path = folder.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/demo-assets/${path}/${COVERAGE_CREDITS_FILE}`;
}

/**
 * 데모 사진의 저작자 · 라이선스 · 원본 주소를 읽어요. 직접 올린 사진만 있으면 요청하지 않고 빈 배열이에요.
 * 추가 확보한 사진은 Storage의 coverage-credits.json에서, 거기 없는 사진(처음부터 있던 사진)은
 * 앱과 같이 배포되는 /photos/credits.json에서 찾아요. 출처가 적히지 않은 사진은 결과에 없어요.
 * 파일을 받지 못하면 오류를 던져요.
 *
 * @param {(string | null | undefined)[]} fileKeys 로그인한 사람의 사진 fileKey
 * @returns {Promise<import('@/types').PhotoCredit[]>} 제목 순서
 */
export async function getPhotoCredits(fileKeys) {
  const { demo, local } = groupDemoFileNames(fileKeys);

  const coverageCredits = await Promise.all(
    [...demo].map(async ([folder, fileNames]) =>
      pickCoverageCredits(await readJson(toCoverageUrl(folder)), fileNames),
    ),
  );
  const credits = coverageCredits.flat();

  const found = new Set(credits.map((credit) => credit.fileName));
  const rest = new Set(local);
  for (const fileNames of demo.values()) {
    for (const fileName of fileNames) if (!found.has(fileName)) rest.add(fileName);
  }
  if (rest.size > 0) credits.push(...pickLocalCredits(await readJson(LOCAL_CREDITS_URL), rest));

  return credits.sort((a, b) => a.title.localeCompare(b.title));
}
