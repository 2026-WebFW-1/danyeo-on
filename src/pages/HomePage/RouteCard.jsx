import { formatDotDate } from '@/utils/mapScreen';
import { cn } from '@/utils/cn';

// 피그마 00의 카드 세 자리예요. 지구본이 오른쪽에 붙어 있어서 오른쪽 기준으로 맞춰요.
const SLOT_STYLES = ['top-13.5 right-21.25', 'top-148.5 right-58.25', 'top-111 right-168'];

/**
 * 경로가 도착하면 떠오르는 카드
 *
 * 의도: 데이터에 공항 코드가 없어서 피그마의 ICN → YVR 자리에 도시 이름을 써요(#117).
 *
 * @param {object} props
 * @param {import('@/utils/globe').GlobeRoute} props.route
 * @param {string} props.homeCity
 * @param {number} props.slot 카드 자리 번호
 */
export default function RouteCard({ route, homeCity, slot }) {
  return (
    <article
      className={cn(
        'absolute border border-line bg-white py-4 pr-6 pl-5 whitespace-nowrap shadow-[0px_8px_24px_0px_rgba(0,0,0,0.07)] backdrop-blur-[6px] motion-safe:animate-route-card',
        SLOT_STYLES[slot],
      )}
    >
      <h2 className="flex items-center gap-3 text-3xl font-bold text-ink">
        {homeCity}
        <span aria-label="에서" className="text-xl text-accent">
          →
        </span>
        {route.city}
      </h2>
      <p className="mt-3.5 text-sm text-body">{`${route.tripName} · ${route.days}일`}</p>
      <p className="mt-1 font-serif text-xs font-bold tracking-[0.2em] text-muted">
        {formatDotDate(route.from)}
      </p>
    </article>
  );
}
