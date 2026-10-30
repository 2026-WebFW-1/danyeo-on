import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/layout/RequireAuth';
import LoginPage from '@/pages/LoginPage/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import UploadPage from '@/pages/UploadPage/UploadPage';
import { useAuthStore } from '@/stores/authStore';

// 주소 하나 = 페이지 하나. 로그인 화면만 Nav 없이 밖에 두고, 나머지는 RequireAuth 안 AppLayout(Nav + 남은 높이)에 그립니다.
// Supabase가 로그인한 사람의 행만 주기 때문에(RLS) 데이터를 보는 화면은 전부 로그인 뒤에 둡니다(#81).
// 아직 없는 페이지(/map, /places, /passport, /chapter/:slug)는 *로 떨어져 NotFoundPage를 봅니다.
export default function App() {
  // 앱을 열 때 한 번 남은 세션을 되살립니다. StrictMode가 두 번 불러도 init()이 한 번만 돕니다.
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* TODO(endl24): 00 홈(입구)이 생기면 HomePage로 바꾸기. 지금은 있는 화면이 사진 올리기뿐이라 보냅니다. */}
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
