import Nav from '@/components/layout/Nav';
import UploadPage from '@/pages/UploadPage/UploadPage';

// Nav 아래 화면이 남은 높이를 채우도록 세로 flex로 둡니다. 화면의 main은 min-h-screen 대신 flex-1을 씁니다.
// min-h-screen을 쓰면 Nav 높이만큼 항상 스크롤이 생깁니다.
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <UploadPage />
    </div>
  );
}
