import { Navigate, Outlet, useLocation } from 'react-router';

import SessionCheckScreen from '@/components/layout/SessionCheckScreen';
import { LOGIN_PATH, REDIRECT_PARAM } from '@/constants/auth';
import { useAuthStore } from '@/stores/authStore';

const HOME_PATH = '/';

/**
 * 로그인한 사람만 안쪽 화면을 보게 막는 문
 *
 * 책임: 로그인 상태를 보고 안쪽 라우트(Outlet)를 그리거나, 로그인 화면으로 보냅니다.
 *
 * 호출: App의 Routes에서 보호할 Route들을 감싸는 부모 Route로 씁니다.
 * <Route element={<RequireAuth />}>…</Route>
 *
 * 의도:
 *  - 보던 주소(경로 + 쿼리 + #)를 ?redirect=에 실어 보내서, 로그인하면 그 화면으로 돌아옵니다(기능 정의서 L104).
 *  - 입구('/')로 처음 들어온 건 보던 화면이 없어서 12b 알림 없이 12a로 보냅니다(피그마 12b는 "401로 돌아온 경우").
 *  - 세션이 만료돼 로그아웃 상태가 되면 여기서 같은 길로 로그인 화면에 갑니다(L106).
 *  - 본인이 [로그아웃]을 눌렀으면(isSignedOutByUser) 돌아올 곳 없이 /login으로만 보냅니다(L105).
 *
 * 주의할 것들:
 *  - 로그아웃 이동을 Nav에서 navigate로 하지 않는 이유: React Router는 이동을 낮은 우선순위로 처리해서,
 *    주소가 바뀌기 전에 여기가 먼저 'anonymous'를 보고 ?redirect=를 붙여 12b로 보냅니다. 그래서 여기 한 곳에서 정합니다.
 *  - 'unknown'(세션 확인 중)에 로그인 화면으로 보내면, 새로고침할 때마다 로그인 화면이 깜빡입니다. 확인이 끝날 때까지 기다립니다.
 *    확인이 오래 걸려도 스토어가 정한 시간 뒤 'anonymous'로 바꿔서 여기서 멈추지 않습니다.
 */
export default function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const isSignedOutByUser = useAuthStore((state) => state.isSignedOutByUser);
  const location = useLocation();

  if (status === 'unknown') return <SessionCheckScreen />;

  if (status === 'anonymous') {
    const from = location.pathname + location.search + location.hash;
    if (isSignedOutByUser || from === HOME_PATH) return <Navigate to={LOGIN_PATH} replace />;

    return <Navigate to={`${LOGIN_PATH}?${REDIRECT_PARAM}=${encodeURIComponent(from)}`} replace />;
  }

  return <Outlet />;
}
