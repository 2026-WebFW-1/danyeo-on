import { Link } from 'react-router';

/**
 * 없는 주소로 왔을 때 보이는 페이지
 *
 * 호출: App의 Routes 맨 끝 path="*"
 *
 * 의도: 아직 만들지 않은 페이지(Map, Places, Passport …)도 Nav에서 누르면 여기로 옵니다.
 * 빈 화면 대신 주소가 틀렸다는 걸 보여 주고 사진 올리기로 돌아갈 길을 둡니다.
 *
 * 주의할 점: 디자인이 없는 임시 화면입니다. 피그마에 화면이 생기면 맞춰 바꿉니다.
 */
export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas px-4">
      <p className="text-lg text-ink">아직 없는 화면이에요.</p>
      <Link to="/upload" className="text-md font-medium text-ink underline">
        사진 올리기로 가기
      </Link>
    </main>
  );
}
