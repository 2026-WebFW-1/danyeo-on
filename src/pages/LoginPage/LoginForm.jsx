import { useState } from 'react';

import { MIN_PASSWORD_LENGTH } from '@/constants/auth';
import { isValidEmail, isValidPassword } from '@/utils/authForm';

/**
 * 이메일·비밀번호 로그인 칸
 *
 * 책임: 입력을 받고, 형식이 틀리면 서버에 보내기 전에 칸 아래에 알려 줍니다. 맞으면 onSubmit으로 넘깁니다.
 * 로그인 요청과 서버 오류 문구는 LoginPage가 맡습니다.
 *
 * 호출: LoginPage
 * <LoginForm isPending={pendingKey === 'form'} isDisabled={pendingKey !== null} onSubmit={handleSignIn} />
 *
 * 의도: 피그마 12a의 [Google로 계속하기] 자리입니다. BE가 Supabase 이메일·비밀번호로 정해서(#81) 바꿨습니다.
 *
 * 주의할 것들:
 *  - 형식 문구는 처음엔 숨기고, [로그인]을 한 번 누른 뒤부터 입력할 때마다 다시 봅니다. 치는 중에 빨간 글이 뜨지 않게 합니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=194-603
 */
export default function LoginForm({ isPending, isDisabled, onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasTried, setHasTried] = useState(false);

  const emailError = hasTried && !isValidEmail(email) ? '이메일 형식이 아니에요' : null;
  const passwordError =
    hasTried && !isValidPassword(password)
      ? `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이에요`
      : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    setHasTried(true);
    if (!isValidEmail(email) || !isValidPassword(password)) return;
    onSubmit(email, password);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* 형식 문구는 label 밖에 두고 aria-describedby로 이어요. label 안에 두면 칸 이름에 문구가 섞여 읽혀요. */}
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium text-body">
          이메일
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={emailError !== null}
          aria-describedby={emailError ? 'login-email-error' : undefined}
          className="h-12 border border-line bg-white px-4 text-lg text-ink"
        />
        {emailError && (
          <span id="login-email-error" className="text-sm text-accent">
            {emailError}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-sm font-medium text-body">
          비밀번호
        </label>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={passwordError !== null}
          aria-describedby={passwordError ? 'login-password-error' : undefined}
          className="h-12 border border-line bg-white px-4 text-lg text-ink"
        />
        {passwordError && (
          <span id="login-password-error" className="text-sm text-accent">
            {passwordError}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="mt-2 h-16 bg-nav text-lg font-bold text-white disabled:opacity-60"
      >
        {isPending ? '들어가는 중…' : '로그인'}
      </button>
    </form>
  );
}
