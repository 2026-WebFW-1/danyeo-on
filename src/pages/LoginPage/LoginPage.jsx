import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import SessionCheckScreen from '@/components/layout/SessionCheckScreen';
import { DEMO_PASSWORD, REDIRECT_PARAM } from '@/constants/auth';
import { useAuthStore } from '@/stores/authStore';
import { getSafeRedirect, getScreenName, getSignInErrorMessage } from '@/utils/authForm';

import DemoLoginButtons from './DemoLoginButtons';
import LoginForm from './LoginForm';
import LoginNotice from './LoginNotice';

// 요청 중인 버튼을 가리키는 값. 데모 버튼은 자기 이메일을 써요.
const FORM_KEY = 'form';

/**
 * 12 로그인 화면 (/login)
 *
 * 책임: 이메일·비밀번호나 데모 계정으로 로그인시키고, 로그인되면 돌아갈 곳으로 보냅니다.
 *
 * 호출: App의 Routes에서 AppLayout 밖(Nav 없이) path="login"
 *
 * 의도:
 *  - ?redirect=가 있으면 보호 화면에서 쫓겨나 온 것이라 12b 알림을 띄웁니다. 걸러진 주소면 띄우지 않습니다.
 *  - 로그인에 성공하면 스토어가 'authenticated'가 되고, 다시 그릴 때 아래 Navigate가 돌아갈 곳으로 보냅니다.
 *    이미 로그인한 사람이 /login에 와도 같은 길로 나갑니다.
 *  - 돌아갈 곳은 getSafeRedirect로 걸러서 다른 사이트나 로그인 화면 자신으로는 가지 않습니다.
 *
 * 주의할 것들:
 *  - 요청 중엔 모든 버튼을 끕니다. 폼과 데모 버튼을 같이 누르면 늦게 끝난 쪽 계정으로 바뀔 수 있습니다.
 *  - 서버 원문(영어)은 보여 주지 않고 getSignInErrorMessage의 문장만 씁니다.
 *  - 가입 화면은 없습니다(#81). 피그마 12에 디자인이 없어서 따로 이슈로 둡니다.
 *
 * 피그마: 12a https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=194-586
 *        12b https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=194-615
 */
export default function LoginPage() {
  const status = useAuthStore((state) => state.status);
  const signIn = useAuthStore((state) => state.signIn);
  const [searchParams] = useSearchParams();
  const [pendingKey, setPendingKey] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const redirectParam = searchParams.get(REDIRECT_PARAM);
  const redirectTo = getSafeRedirect(redirectParam);
  // 걸러져서 홈으로 가는 주소(//evil.com 등)면 "보던 화면으로 돌아가요"가 거짓말이라 알림을 띄우지 않아요.
  const hasReturnTarget = redirectParam !== null && redirectTo === redirectParam;

  // 세션 확인 중에 폼을 그리면, 이미 로그인한 사람에게 폼이 잠깐 보였다가 사라져요.
  if (status === 'unknown') return <SessionCheckScreen />;

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSignIn = async (email, password, key) => {
    setPendingKey(key);
    setErrorMessage(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
      setPendingKey(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-110 flex-col gap-8">
        {hasReturnTarget && <LoginNotice screenName={getScreenName(redirectTo)} />}

        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="font-serif text-7xl font-bold text-ink">My Journey</h1>
          <p className="text-xl break-keep text-muted">
            사진의 촬영 시각과 위치로 여행을 다시 묶어 보여 줍니다
          </p>
        </header>

        <LoginForm
          isPending={pendingKey === FORM_KEY}
          isDisabled={pendingKey !== null}
          onSubmit={(email, password) => handleSignIn(email, password, FORM_KEY)}
        />

        {errorMessage && (
          <p role="alert" className="-mt-4 text-center text-md text-accent">
            {errorMessage}
          </p>
        )}

        {import.meta.env.DEV && (
          <DemoLoginButtons
            pendingEmail={pendingKey}
            isDisabled={pendingKey !== null}
            onPick={(email) => handleSignIn(email, DEMO_PASSWORD, email)}
          />
        )}
      </div>
    </main>
  );
}
