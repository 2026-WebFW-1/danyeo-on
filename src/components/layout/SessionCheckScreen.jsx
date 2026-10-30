/**
 * 로그인 상태를 확인하는 동안 보여 주는 화면
 *
 * 책임: 세션 확인('unknown')이 끝날 때까지 화면 가운데에 안내 한 줄을 그립니다.
 *
 * 호출: RequireAuth와 LoginPage가 status가 'unknown'일 때 그립니다. 받는 값은 없습니다.
 * if (status === 'unknown') return <SessionCheckScreen />;
 *
 * 의도: 확인이 끝나기 전에 로그인 화면이나 보호 화면을 그리면 새로고침할 때마다 깜빡여서, 둘 다 이 화면을 먼저 보여 줍니다.
 *
 * 주의할 것들:
 *  - Nav 없이 화면 전체를 씁니다. 로그인 화면(AppLayout 밖)에서도 같은 모양이어야 해서입니다.
 *
 * 피그마: 없음(로딩 디자인이 없어서 로그인 화면 배경과 글자색만 맞췄습니다)
 */
export default function SessionCheckScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="text-md text-muted">로그인 상태를 확인하는 중…</p>
    </main>
  );
}
