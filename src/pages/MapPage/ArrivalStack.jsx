import { usePlaybackPosition } from '@/hooks/usePlayback';
import { usePlaybackStore } from '@/stores/playbackStore';
import { selectArrivalStops } from '@/utils/mapScreen';

import ArrivalCard from './ArrivalCard';

// 피그마 01 Arrival stack의 놓인 모양이에요. 0번이 맨 앞(지금 지점)이고 뒤로 갈수록 앞 지점이에요.
const CARD_POSES = ['', '-translate-y-6 -rotate-3', '-translate-x-6 -translate-y-6 rotate-5'];

/**
 * 01 오른쪽 아래의 도착 카드 더미
 *
 * 책임: 지점에 도착해 머무는 동안 그 지점 카드를 맨 앞에 두고, 앞 지점 카드를 뒤에 겹쳐 그립니다.
 * 호출: MapPage
 *
 * 의도: 나중 카드가 위에 그려지므로 맨 앞 카드가 마지막이 되게 뒤집어 그립니다.
 * 카드 밑의 지도도 누를 수 있게 상자는 포인터를 받지 않습니다.
 *
 * @param {object} props
 * @param {import('@/types').Stop[]} props.stops
 */
export default function ArrivalStack({ stops }) {
  const legs = usePlaybackStore((state) => state.legs);
  const position = usePlaybackPosition();
  const arrivalStops = selectArrivalStops(legs, stops, position);

  if (arrivalStops.length === 0) return null;

  return (
    <section
      aria-label="도착한 지점"
      className="pointer-events-none absolute right-8 bottom-8 size-75"
    >
      {arrivalStops
        .map((stop, index) => ({ stop, pose: CARD_POSES[index] }))
        .reverse()
        .map(({ stop, pose }) => (
          <ArrivalCard key={stop.id} stop={stop} className={pose} />
        ))}
    </section>
  );
}
