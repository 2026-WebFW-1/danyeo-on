/**
 * 화면 아래 가운데에 뜨는 서버 오류 안내(15b)
 *
 * 책임: 문구와 [다시 시도]를 보여 주고, 누르면 onRetry를 부릅니다. 언제 띄울지는 부르는 쪽이 정합니다.
 *
 * 호출: BackgroundErrorToast(AppLayout)
 * <ErrorToast message="서버에 연결하지 못했어요" onRetry={handleRetry} />
 *
 * 의도: 화면을 가리지 않게 아래에 작게 띄우고, 화면은 그대로 쓸 수 있게 둡니다.
 *
 * 주의할 것들:
 *  - 저절로 사라지지 않습니다. 실패가 남아 있는 동안 계속 보여야 [다시 시도]를 누를 수 있어요. 닫는 건 부르는 쪽이 합니다.
 *  - role="alert"라서 처음 뜰 때 스크린 리더가 바로 읽어 줍니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-285
 *
 * @param {object} props
 * @param {string} props.message
 * @param {() => void} props.onRetry
 */
export default function ErrorToast({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="fixed bottom-12 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 bg-nav px-6 py-4 text-md text-white"
    >
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="font-medium text-accent">
        다시 시도
      </button>
    </div>
  );
}
