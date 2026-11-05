import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';
import { toLocalDate } from '@/utils/localDate';

/**
 * 01 도착 카드 한 장. 대표 사진, 날짜, 도시, 나라 코드, 머문 날과 사진 수를 보여 줍니다.
 *
 * 호출: ArrivalStack
 * 의도: 대표 사진이 없는 지점은 회색 칸으로 둡니다. 회색은 PhotoGridCell과 같은 bg-line입니다.
 *
 * @param {object} props
 * @param {import('@/types').Stop} props.stop
 * @param {string} [props.className]
 */
export default function ArrivalCard({ stop, className }) {
  const src = usePhoto(stop.coverFileKey, 'thumb');

  return (
    <article
      className={cn(
        'absolute top-11.5 left-8 w-65.5 overflow-hidden rounded-xs border border-line bg-white shadow-[0px_10px_28px_0px_rgba(0,0,0,0.1)]',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={`${stop.city} 대표 사진`} className="h-37.5 w-full object-cover" />
      ) : (
        <div className="h-37.5 w-full bg-line" />
      )}
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
