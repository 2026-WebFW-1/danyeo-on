const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

/**
 * 낱말 끝 글자에 받침이 있는지 봐요. 한글이 아니면 받침을 알 수 없어서 null이에요.
 *
 * @param {string} word
 * @returns {boolean | null}
 */
function hasFinalConsonant(word) {
  const code = word.trim().at(-1)?.charCodeAt(0);
  if (code === undefined || code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % JONGSEONG_COUNT !== 0;
}

/**
 * 낱말에 받침에 맞는 조사를 붙여요. 한글이 아닌 낱말(영문 도시 이름 등)은 받침을 몰라서 "은(는)"처럼 둘 다 적어요.
 *
 * @param {string} word
 * @param {string} withFinal 받침이 있을 때 조사. 예: '은'
 * @param {string} withoutFinal 받침이 없을 때 조사. 예: '는'
 * @returns {string} 예: '서울은'
 */
export function attachJosa(word, withFinal, withoutFinal) {
  const hasFinal = hasFinalConsonant(word);
  if (hasFinal === null) return `${word}${withFinal}(${withoutFinal})`;
  return `${word}${hasFinal ? withFinal : withoutFinal}`;
}

/** @param {string} word @returns {string} 예: '부산은', '도쿄는' */
export const withTopicJosa = (word) => attachJosa(word, '은', '는');

/** @param {string} word @returns {string} 예: '서울을', '도쿄를' */
export const withObjectJosa = (word) => attachJosa(word, '을', '를');
