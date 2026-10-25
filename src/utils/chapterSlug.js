import { toLocalYear } from '@/utils/localDate';

// 겹친 주소는 두 번째부터 번호를 붙여요. 첫 번째는 번호가 없어요('파리-2025', '파리-2025-2').
const FIRST_DUPLICATE_NO = 2;

// 주소(/chapter/:slug)를 깨뜨리거나 뜻이 있는 글자예요. 공백과 함께 -로 바꿔요.
const UNSAFE_CHARS = /[\s/?#%]+/g;

// 바꾸고 나면 도시 이름 양 끝에 -가 남을 수 있어서(예: '/파리/') 떼어 내요.
const EDGE_DASHES = /^-+|-+$/g;

/**
 * 챕터 지점 하나의 주소(`/chapter/:slug`의 slug)를 만들어요. 예: '밴쿠버-2025'
 * 도시 이름과 처음 찍은 해(현지 연도)를 이어 붙이고, 이미 쓴 주소와 겹치면 '-2', '-3'을 붙여요.
 * 챕터인지는 따로 판정하지 않아요. 경유 지점(`transit`)만 챕터가 될 수 없어서 null이에요.
 * 이름을 못 찾은 지점은 reverseCity가 '이름 없는 곳'을 주므로 city는 비어 있지 않다고 봐요.
 *
 * @param {import('@/types').Stop} stop
 * @param {Iterable<string> | null} [takenSlugs] 이미 쓴 주소(Set이나 배열). 받기만 하고 바꾸지 않아요.
 *   안 주면 겹침을 보지 않아요. 앞서 만든 주소를 모아 두는 건 부르는 쪽이에요.
 * @returns {string | null}
 */
export function chapterSlug(stop, takenSlugs) {
  if (stop.transit) return null;

  const city = stop.city.replace(UNSAFE_CHARS, '-').replace(EDGE_DASHES, '');
  const base = `${city}-${toLocalYear(stop.from)}`;

  // 비어 있는 첫 번호를 써요. 가운데가 비면 그 번호를 먼저 채워요('-1'은 없고 -2부터예요).
  const taken = new Set(takenSlugs);
  let slug = base;
  for (let no = FIRST_DUPLICATE_NO; taken.has(slug); no += 1) {
    slug = `${base}-${no}`;
  }

  return slug;
}
