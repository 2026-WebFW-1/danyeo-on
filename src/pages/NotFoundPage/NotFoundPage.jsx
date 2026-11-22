import { Link } from 'react-router';

/**
 * 없는 주소로 왔을 때 보이는 페이지
 *
 * 호출: App의 Routes 맨 끝 path="*"
 *
 * 의도: 주소를 잘못 적거나 지워진 화면으로 오면 여기로 옵니다.
 * 빈 화면 대신 주소가 틀렸다는 걸 보여 주고 홈으로 돌아갈 길을 둡니다.
 * 여행이 이미 있는 사람도 오는 화면이라 사진 올리기가 아니라 홈으로 보냅니다.
 *
 * 주의할 점: 피그마에 이 화면이 따로 없어서 카드 모양(크기·여백·글자)은 15a 빈 상태(NoTripsNotice)를 따릅니다.
 * NoTripsNotice의 모양을 바꾸면 여기도 같이 맞춥니다.
 */
export default function NotFoundPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-30 py-20">
      <section className="flex w-130 max-w-full flex-col items-center gap-3 border border-line bg-white p-10 text-center">
        <h1 className="text-4xl font-bold text-ink">주소를 찾을 수 없어요</h1>
        <p className="text-lg leading-body-lg text-muted">
          주소가 잘못됐거나
          <br />
          지워진 화면일 수 있어요
        </p>
        <Link to="/" className="bg-nav px-6 py-4 text-lg font-bold text-white">
          홈으로
        </Link>
      </section>
    </main>
  );
}
