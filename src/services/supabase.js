import { createClient } from '@supabase/supabase-js';

// 주소와 키는 .env.local 에 있어요. 없으면 .env.example 을 복사해서 채워요.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 가 없어요. .env.local 을 확인해 주세요.',
  );
}

/** 앱 전체가 같이 쓰는 Supabase 클라이언트예요. 로그인 세션은 localStorage 에 남아요. */
export const supabase = createClient(url, key);
