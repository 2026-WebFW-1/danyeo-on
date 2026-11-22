import { Link } from 'react-router';

import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';
import { toLocalDate } from '@/utils/localDate';
import { getStopLink } from '@/utils/stopPath';

/**
 * 01 도착 카드 한 장. 대표 사진, 날짜, 도시, 나라 코드, 머문 날과 사진 수를 보여 줍니다.
 *
 * 호출: ArrivalCards
 *
 * 의도:
 *  - 대표 사진이 없는 지점은 회색 칸으로 둡니다. 회색은 PhotoGridCell과 같은 bg-line입니다.
 *  - hasLink면 사진 오른쪽 아래에 [챕터 열기 →]나 [전체 기록 보기 →]를 얹어요(getStopLink, #206).
 *    링크의 ::after를 카드 전체에 깔아서 카드 어디를 눌러도 가요. 그래서 링크와 카드 사이에
 *    position을 가진 요소를 두지 않고, 사진 위에 얹는 것도 absolute 대신 grid의 같은 칸에 겹쳐요.
 *  - 피그마 01 Arrival stack에는 가는 길이 없어서, 카드 크기가 바뀌지 않게 사진 위에 얹었어요.
 *    모양은 지도의 다른 검은 라벨(도착 예정, 여행 이름)과 같아요.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop
 * @param {boolean} [props.hasLink] 켜면 이 지점의 02 챕터나 03 기록으로 가는 링크를 둬요. 맨 앞 카드만 켜요
 * @param {string} [props.className]
 */
export default function ArrivalCard({ stop, hasLink = false, className }) {
  const src = usePhoto(stop.coverFileKey, 'thumb');
  const link = hasLink ? getStopLink(stop) : null;

  return (
    <article
      className={cn(
        'absolute top-11.5 left-8 w-65.5 overflow-hidden rounded-xs border border-line bg-white shadow-[0px_10px_28px_0px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      <div className="grid">
        {src ? (
          <img
            src={src}
            alt={`${stop.city} 대표 사진`}
            className="col-start-1 row-start-1 h-37.5 w-full object-cover"
          />
        ) : (
          <div className="col-start-1 row-start-1 h-37.5 w-full bg-line" />
        )}
        {link && (
          <Link
            to={link.path}
            aria-label={`${stop.city} ${link.label}`}
            className="col-start-1 row-start-1 m-3 flex items-center gap-1 self-end justify-self-end bg-ink px-3 py-1 text-2xs font-bold whitespace-nowrap text-white transition-colors after:absolute after:inset-0 hover:bg-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {link.label}
            <span aria-hidden="true" className="font-serif">
              →
            </span>
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-1 px-5 pt-4 pb-5 whitespace-nowrap">
        <p className="font-serif text-2xs font-bold tracking-[0.2em] text-muted">
          {toLocalDate(stop.from)}
        </p>
        <h3 className="flex items-baseline gap-1 font-bold text-ink">
          <span className="text-2xl">{stop.city}</span>
          <span className="font-serif text-sm">{stop.cc}</span>
        </h3>
        <p className="text-sm text-body">
          {stop.days}일 · 사진 {stop.photoCount}장
        </p>
      </div>
    </article>
  );
}
