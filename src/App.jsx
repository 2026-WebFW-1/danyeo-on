import { Navigate, Route, Routes } from 'react-router';

import AppLayout from '@/components/layout/AppLayout';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import UploadPage from '@/pages/UploadPage/UploadPage';

// 주소 하나 = 페이지 하나. 모든 페이지는 AppLayout(Nav + 남은 높이) 안에 그립니다.
// 아직 없는 페이지(/map, /places, /passport, /chapter/:slug)는 *로 떨어져 NotFoundPage를 봅니다.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* TODO(endl24): 00 홈(입구)이 생기면 HomePage로 바꾸기. 지금은 있는 화면이 사진 올리기뿐이라 보냅니다. */}
        <Route index element={<Navigate to="/upload" replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
