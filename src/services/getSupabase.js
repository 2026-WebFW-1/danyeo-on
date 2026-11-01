// supabase.js 는 주소 키(.env.local)가 없으면 불러오는 순간 오류를 던집니다.
// 맨 위에서 import 하면 .env.local이 없는 PC에서 앱 전체가 흰 화면이 되어서, 처음 쓸 때 불러옵니다.
// 실패하면 기억을 지우고, 네트워크가 잠깐 끊겼던 경우에도 다음 요청 때 다시 불러옵니다.
// 원인(".env.local을 확인해주세요")는 콘솔에 남깁니다.
let clientPromise = null;

/**
 * 앱 전체가 같이 쓰는 Supabase 클라이언트를 처음 부를 때 불러와요.
 * 불러오지 못하면 오류를 던집니다. 화면에 무엇을 보여 줄지는 부른 쪽이 결정합니다.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export function getSupabase() {
  clientPromise ??= import('@/services/supabase').then(
    (module) => module.supabase,
    (error) => {
      clientPromise = null;
      console.error(error);
      throw error;
    },
  );
  return clientPromise;
}
