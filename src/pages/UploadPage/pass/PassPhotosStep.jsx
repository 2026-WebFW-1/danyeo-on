import PassControls from './PassControls';
import PassStrip from './PassStrip';
import PassTimeline from './PassTimeline';

/**
 * 사진을 시간순 한 줄로 훑으며 빈칸을 채우는 화면 (13h″ 지나가며 정리, #129)
 *
 * 책임: 확실한 사진은 그냥 넣고, 애매한 사진은 천천히 지나가며 보여 줍니다.
 * 지금은 껍데기만 있고, 사진 줄이 저절로 지나가는 동작과 분류는 다음 이슈에서 붙입니다.
 *
 * 호출: UploadPage가 쌓기 화면에서 [다음]을 누르면 그립니다.
 * <PassPhotosStep />
 */
export default function PassPhotosStep() {
  return (
    <main className="flex flex-1 flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-360 flex-1 flex-col px-6 pt-6 pb-4 lg:px-16 2xl:max-w-400">
        {/* 넓은 화면에서는 오른쪽 칸에 진행 표시를 둬요 */}
        <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_16.25rem] lg:gap-12">
          <div>
            <p className="text-xs leading-normal font-medium tracking-[0.04em] text-accent">
              다음 단계 · 지나가며 정리
            </p>
            <h1 className="mt-3 text-5xl font-bold text-ink 2xl:text-6xl">지나가면서 정리할게요</h1>
            <p className="mt-3 text-lg break-keep text-muted">애매한 건 천천히 지나가요.</p>
          </div>
          <PassTimeline currentIndex={0} />
        </header>
        <section aria-label="사진 정리" className="flex flex-1 flex-col justify-center py-4">
          <PassStrip currentIndex={0} />
          <PassControls />
        </section>
      </div>
    </main>
  );
}
