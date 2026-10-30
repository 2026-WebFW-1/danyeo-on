/**
 * 12b 위의 "로그인이 필요해요" 알림
 *
 * 책임: 보호 화면에서 쫓겨나 왔다는 것과, 로그인하면 어디로 돌아가는지 알려 줍니다.
 *
 * 호출: LoginPage가 ?redirect=가 있을 때만 그립니다.
 * <LoginNotice screenName="사진 올리기" />
 *
 * 주의할 것들:
 *  - 화면 이름을 모르는 주소면 screenName이 null이라 "보던 화면으로"만 씁니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=194-629
 */
export default function LoginNotice({ screenName }) {
  const target = screenName ? `보던 화면(${screenName})` : '보던 화면';

  return (
    <div role="status" className="border-l-4 border-accent bg-white px-4 py-3">
      <p className="text-md font-bold text-ink">로그인이 필요해요</p>
      <p className="text-sm text-muted">로그인하면 {target}으로 돌아가요</p>
    </div>
  );
}
