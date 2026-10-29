import { Outlet } from 'react-router';

import Nav from '@/components/layout/Nav';

/**
 * 모든 페이지가 같이 쓰는 틀. 위에 Nav, 아래에 지금 주소의 페이지(Outlet)
 *
 * 호출: App의 Routes에서 다른 Route를 감싸는 부모 Route로 씁니다.
 * <Route element={<AppLayout />}>…</Route>
 *
 * 의도: Nav 아래 화면이 남은 높이를 채우도록 세로 flex로 둡니다. 페이지의 main은 min-h-screen 대신 flex-1을 씁니다.
 * min-h-screen을 쓰면 Nav 높이만큼 항상 스크롤이 생깁니다.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <Outlet />
    </div>
  );
}
