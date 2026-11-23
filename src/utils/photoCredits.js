import { LICENSE_URLS } from '@/constants/credits';

const DEMO_PREFIX = 'demo:';
const PUBLIC_PREFIX = 'public:';
// 위키미디어 공용의 제목은 'File:이름.jpg' 모양이에요. 화면에는 이름만 보여 줘요.
const TITLE_PREFIX = /^File:/;
const TITLE_EXTENSION = /\.[a-z0-9]{2,5}$/i;

/**
 * 사진들의 fileKey에서 출처를 찾을 데모 사진 파일 이름을 모아요. 직접 올린 사진(photos:)과 이미지 없는 사진은 빠져요.
 * demo: 사진은 출처 파일이 폴더(<uuid>/<인물>)마다 따로 있어서 폴더별로 나눠요.
 *
 * @param {(string | null | undefined)[]} fileKeys
 *   예: ['demo:d000…0001/seojin/commons-021e.webp', 'public:/photos/tokyo-1.webp', 'photos:u1/p_1', null]
 * @returns {{ demo: Map<string, Set<string>>, local: Set<string> }}
 *   예: { demo: Map { 'd000…0001/seojin' => Set { 'commons-021e.webp' } }, local: Set { 'tokyo-1.webp' } }
 */
export function groupDemoFileNames(fileKeys) {
  const demo = new Map();
  const local = new Set();

  for (const fileKey of fileKeys) {
    if (fileKey?.startsWith(DEMO_PREFIX)) {
      const parts = fileKey.slice(DEMO_PREFIX.length).split('/');
      if (parts.length !== 3 || parts.some((part) => !part)) continue;
      const [owner, persona, fileName] = parts;
      const folder = `${owner}/${persona}`;
      if (!demo.has(folder)) demo.set(folder, new Set());
      demo.get(folder).add(fileName);
    } else if (fileKey?.startsWith(PUBLIC_PREFIX)) {
      local.add(fileKey.slice(fileKey.lastIndexOf('/') + 1));
    }
  }
  return { demo, local };
}

// 저작자 칸에 '이 사진은 … 로 찍었어요' 같은 덧붙임이 여러 줄로 따라오는 경우가 있어서 첫 줄만 써요.
function toCredit({ fileName, title, author, license, licenseUrl, sourceUrl }) {
  return {
    fileName,
    title: title.replace(TITLE_PREFIX, '').replace(TITLE_EXTENSION, ''),
    author: author.trim().split('\n')[0].trim(),
    license,
    licenseUrl: licenseUrl ?? LICENSE_URLS[license] ?? null,
    sourceUrl: sourceUrl ?? null,
  };
}

/**
 * coverage-credits.json에서 쓰는 사진의 출처만 골라요.
 * @param {{ assets?: object[] }} coverage Storage의 <uuid>/<인물>/coverage-credits.json
 * @param {Set<string>} fileNames
 * @returns {import('@/types').PhotoCredit[]}
 */
export function pickCoverageCredits(coverage, fileNames) {
  return (coverage.assets ?? [])
    .filter((asset) => fileNames.has(asset.filename) && asset.author && asset.license)
    .map((asset) => toCredit({ ...asset, fileName: asset.filename }));
}

/**
 * public/photos/credits.json에서 쓰는 사진의 출처만 골라요. 저작자나 라이선스가 적히지 않은 사진은 빠져요.
 * @param {Record<string, object[]>} localCredits 도시별 목록. 예: { tokyo: [{ file: '/photos/full/tokyo-1.webp', … }] }
 * @param {Set<string>} fileNames
 * @returns {import('@/types').PhotoCredit[]}
 */
export function pickLocalCredits(localCredits, fileNames) {
  return Object.values(localCredits)
    .flat()
    .map((entry) => ({ ...entry, fileName: entry.file.slice(entry.file.lastIndexOf('/') + 1) }))
    .filter((entry) => fileNames.has(entry.fileName) && entry.artist && entry.license)
    .map((entry) => toCredit({ ...entry, author: entry.artist, sourceUrl: entry.source }));
}
