import { Link } from 'react-router';

import { cn } from '@/utils/cn';

/**
 * 여행이 하나도 없을 때 사진 올리기로 안내하는 카드예요.
 *
 * 호출: 03 전체 기록(R110)과 01 지도(15a)가 같은 문구로 써요. 놓을 자리와 크기는 부르는 쪽이 className으로 정해요.
 * <NoTripsNotice />
 *
 * 의도: 문구와 모양은 피그마 15a "여행 0개" 그대로예요. 첫 화면에서 막히지 않게 [사진 올리기]로 바로 보내요.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export default function NoTripsNotice({ className }) {
  return (
    <section
      className={cn(
        'flex w-130 max-w-full flex-col items-center gap-3 border border-line bg-white p-10 text-center',
        className,
      )}
    >
      <h2 className="text-4xl font-bold text-ink">아직 여행이 없어요</h2>
      <p className="text-lg leading-body-lg text-muted">
        사진을 올리면 촬영 시각과 위치로
        <br />
        여행을 만들어 지도에 그려 드려요
      </p>
      <Link to="/upload" className="bg-nav px-6 py-4 text-lg font-bold text-white">
        사진 올리기
      </Link>
    </section>
  );
}
