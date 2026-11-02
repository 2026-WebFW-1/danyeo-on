// 픽스처 모드: 로그인한 데모 계정에 맞는 src/data/fixtures/<인물>.journey.json을 Journey로 줘요.
// 데모 데이터가 Supabase로 옮겨지면(#86) 이 파일 안만 바꾸고, 부르는 쪽(useJourney)은 그대로 둬요.

const DEMO_DOMAIN = 'demo.local';
const PERSONA_NAME = /^[a-z]+$/;
const EMPTY_PERSONA = 'empty';
// fixture를 만든 스크립트가 붙인 설명용 칸이에요. 화면이 받을 Journey에는 없어요.
const NOTE_KEYS = ['personaId', 'generatedBy', 'about'];

// 인물마다 따로 불러와요. heavy(272KB)는 그 계정으로 로그인했을 때만 받아요.
const loaders = new Map(
  Object.entries(import.meta.glob('../data/fixtures/*.journey.json', { import: 'default' })).map(
    ([path, load]) => [path.match(/([^/]+)\.journey\.json$/)[1], load],
  ),
);

// 인물별로 한 번만 읽어요. 모든 화면이 같은 객체를 받고, 다른 화면으로 가도 다시 읽지 않아요.
const cache = new Map();

/**
 * 로그인한 사람의 이메일로 데모 인물을 골라요.
 * `<소문자 이름>@demo.local`이면 그 이름이고, 그 밖의 계정은 빈 계정(empty)이에요.
 * @param {import('@/types').AuthUser | null} user
 * @returns {string | null} 로그인 전이면 null
 */
export function personaOf(user) {
  if (!user) return null;
  const [name, domain] = user.email.split('@');
  return domain === DEMO_DOMAIN && PERSONA_NAME.test(name) ? name : EMPTY_PERSONA;
}

/**
 * 인물의 fixture Journey를 읽어요. 설명용 칸(personaId · generatedBy · about)은 빼요.
 * 실패하면 { status, code, message }로 거절해요. fixture가 없으면 NOT_FOUND, 읽기 실패면 LOAD_FAILED예요.
 * 읽기가 실패하면 기억을 지워서 다음에 다시 읽어요.
 * @param {string} persona 예: 'seojin'
 * @returns {Promise<import('@/types').Journey>}
 */
export function getFixtureJourney(persona) {
  const load = loaders.get(persona);
  if (!load) {
    return Promise.reject({
      status: 404,
      code: 'NOT_FOUND',
      message: `fixture 없음: ${persona}.journey.json`,
    });
  }

  if (!cache.has(persona)) {
    cache.set(
      persona,
      load().then(
        (fixture) =>
          Object.fromEntries(Object.entries(fixture).filter(([key]) => !NOTE_KEYS.includes(key))),
        (error) => {
          cache.delete(persona);
          throw { status: 0, code: 'LOAD_FAILED', message: error.message };
        },
      ),
    );
  }
  return cache.get(persona);
}
