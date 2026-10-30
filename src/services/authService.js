// supabase.js는 주소·키(.env.local)가 없으면 불러오는 순간 오류를 던져요.
// 맨 위에서 import하면 .env.local이 없는 PC에서 앱 전체가 흰 화면이 돼서, 처음 쓸 때 불러와요.
// 실패하면 각 함수가 오류를 던지고, init()은 로그인 화면을, 로그인은 "서버에 연결하지 못했어요"를 보여 줘요.
// 원인(".env.local을 확인해 주세요")은 콘솔에 한 번 남겨요.
let clientPromise = null;

function getClient() {
  clientPromise ??= import('@/services/supabase').then(
    (module) => module.supabase,
    (error) => {
      console.error(error);
      throw error;
    },
  );
  return clientPromise;
}

/**
 * Supabase 사용자를 화면이 쓰는 모양으로 바꿔요.
 * 이름은 가입할 때 넣은 user_metadata.name이에요. BE 가입 트리거가 profiles.name도 같은 값으로 만들어서
 * profiles를 한 번 더 부르지 않아요. 이름이 비면 트리거처럼 이메일 앞부분을 써요.
 * @param {{ id: string, email?: string, user_metadata?: { name?: string } }} user
 * @returns {import('@/types').AuthUser}
 */
export function toAuthUser(user) {
  const email = user.email ?? '';
  return { id: user.id, email, name: user.user_metadata?.name || email.split('@')[0] };
}

/**
 * 브라우저에 남은 세션으로 로그인한 사람을 찾아요. 로그인 안 했으면 null이에요.
 * @returns {Promise<import('@/types').AuthUser | null>}
 */
export async function getSessionUser() {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ? toAuthUser(data.session.user) : null;
}

/**
 * 이메일·비밀번호로 로그인해요. 틀리면 Supabase AuthError를 던져요.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('@/types').AuthUser>}
 */
export async function signInWithPassword(email, password) {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return toAuthUser(data.user);
}

/**
 * 이 브라우저만 로그아웃해요. 서버 요청이 실패해도 보통은 브라우저의 세션이 지워져요.
 * (드물게 세션을 읽는 것부터 실패하면 남을 수 있어요. 그때는 새로고침하면 다시 로그인돼 보여요.)
 * 기본값(global)은 그 계정의 모든 기기를 끊어요. 팀원이 같은 데모 계정을 같이 쓰므로
 * 한 사람이 로그아웃하면 남도 끊기지 않게 local로 둬요.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const supabase = await getClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

/**
 * 세션이 끊길 때(만료, 다른 탭에서 로그아웃) 부를 함수를 걸어요.
 * 콜백 안에서 Supabase를 다시 부르면 멈출 수 있어서(supabase-js 안내), 상태만 바꾸는 함수를 넘겨요.
 * Supabase를 못 불러오면 걸지 않아요. 그때는 애초에 로그인할 수 없어요.
 * @param {() => void} callback
 * @returns {() => void} 걸어 둔 것을 떼는 함수
 */
export function onSessionEnd(callback) {
  let subscription = null;
  let isStopped = false;

  getClient()
    .then((supabase) => {
      if (isStopped) return;
      ({ subscription } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) callback();
      }).data);
    })
    .catch(() => {});

  return () => {
    isStopped = true;
    subscription?.unsubscribe();
  };
}
