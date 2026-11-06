/**
 * 챕터 화면이 그릴 게 없을 때 가운데에 보여 주는 안내 한 줄이에요(불러오는 중 · 불러오지 못함).
 *
 * 호출: ChapterPage가 데이터를 기다리거나 못 받았을 때 써요.
 * <ChapterNotice role="status">챕터를 불러오는 중이에요</ChapterNotice>
 * <ChapterNotice role="alert">챕터를 불러오지 못했어요. 새로고침해 주세요.</ChapterNotice>
 *
 * @param {object} props
 * @param {'status' | 'alert'} props.role status는 기다리는 중, alert는 실패예요
 * @param {import('react').ReactNode} props.children
 */
export default function ChapterNotice({ role, children }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas">
      <p role={role} className={role === 'alert' ? 'text-lg text-body' : 'text-lg text-muted'}>
        {children}
      </p>
    </main>
  );
}
