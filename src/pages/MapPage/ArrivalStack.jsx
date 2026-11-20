import { usePlaybackPosition } from '@/hooks/usePlayback';
import { usePlaybackStore } from '@/stores/playbackStore';
import { selectArrivalStops } from '@/utils/mapScreen';

import ArrivalCards from './ArrivalCards';

/**
 * 01 오른쪽 아래의 도착 카드 더미
 *
 * 책임: 지점에 도착해 머무는 동안 그 지점 카드를 맨 앞에 두고, 앞 지점 카드를 뒤에 겹쳐 그립니다.
 *       카드 더미에 마우스를 올리면 그 여행의 사진을 펼쳐요(ArrivalCards, #187).
 * 호출: MapPage
 *
 * 의도: 도착한 지점이 없으면 아무것도 그리지 않아요. 펼침 상태는 ArrivalCards가 들고 있어서,
 *       카드가 사라지면 상태도 같이 사라지고 다음에 나타날 때 접힌 채로 시작해요.
 *       (마우스를 올린 채 카드가 사라지면 mouseleave가 오지 않아서, 상태를 여기 두면 펼친 채 남아요.)
 *
 * @param {object} props
 * @param {import('@/types').Stop[]} props.stops
 * @param {import('@/types').Trip[]} props.trips
 */
export default function ArrivalStack({ stops, trips }) {
  const legs = usePlaybackStore((state) => state.legs);
  const position = usePlaybackPosition();
  const arrivalStops = selectArrivalStops(legs, stops, position);

  if (arrivalStops.length === 0) return null;

  const trip = trips.find(({ id }) => id === arrivalStops[0].tripId) ?? null;
  return <ArrivalCards arrivalStops={arrivalStops} stops={stops} trip={trip} />;
}
