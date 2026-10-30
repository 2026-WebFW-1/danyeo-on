import { DEMO_ACCOUNTS } from '@/constants/auth';

/**
 * "로컬 개발용" 데모 계정 버튼들
 *
 * 책임: 데모 계정을 하나 고르면 onPick(email)으로 알립니다. 로그인 요청은 LoginPage가 합니다.
 *
 * 호출: LoginPage가 개발 모드(import.meta.env.DEV)에서만 그립니다.
 * <DemoLoginButtons pendingEmail={pendingKey} isDisabled={pendingKey !== null} onPick={handleDemoPick} />
 *
 * 의도: 피그마 12a는 [윤서진으로 보기] 하나지만, edge·empty를 고르게 할지는 D가 정하기로 했습니다(기능 정의서 L102).
 * 경계 케이스·빈 상태 화면을 자주 확인해야 해서 셋 다 둡니다. 기본 시연인 윤서진을 맨 위에 둡니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=194-611
 */
export default function DemoLoginButtons({ pendingEmail, isDisabled, onPick }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-dim">로컬 개발용</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {DEMO_ACCOUNTS.map((account) => (
        <button
          key={account.email}
          type="button"
          disabled={isDisabled}
          onClick={() => onPick(account.email)}
          className="h-14 border border-nav bg-white text-lg font-medium text-ink disabled:opacity-60"
        >
          {pendingEmail === account.email ? '들어가는 중…' : account.label}
        </button>
      ))}
    </div>
  );
}
