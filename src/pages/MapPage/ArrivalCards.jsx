import { useEffect, useMemo, useState } from 'react';

import { ARRIVAL_FAN_LIMIT } from '@/constants/arrivalFan';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePlaybackStore } from '@/stores/playbackStore';
import { cn } from '@/utils/cn';
import { createSeed } from '@/utils/seededPick';
import { scatterFanPoses, selectTripFanPhotos } from '@/utils/tripFanPhotos';

import ArrivalCard from './ArrivalCard';
import ArrivalFanPhoto from './ArrivalFanPhoto';

// 피그마 01 Arrival stack의 놓인 모양이에요. 0번이 맨 앞(지금 지점)이고 뒤로 갈수록 앞 지점이에요.
const CARD_POSES = ['', '-translate-y-6 -rotate-3', '-translate-x-6 -translate-y-6 rotate-5'];

/**
 * 01 오른쪽 아래의 도착 카드 더미. 마우스를 올리면 그 여행의 사진을 왼쪽 위로 흩뿌려 펼쳐요(#187).
 *
 * 호출: ArrivalStack이 도착한 지점이 있을 때만 그려요. 그래서 지점이 사라지면 펼침 상태도 같이 사라져요.
 *
 * 의도:
 *  - 나중 카드가 위에 그려지므로 맨 앞 카드가 마지막이 되게 뒤집어 그립니다.
 *  - 상자는 포인터를 받지 않고 카드만 받아요. 카드 밖 빈 구석으로는 밑의 지도를 누를 수 있어요.
 *  - 카드에 마우스를 올리거나 키보드로 포커스하면 맨 앞 카드가 속한 여행 전체의 사진을 펼쳐요.
 *    펼친 동안에는 사진 사이 빈틈을 지나도 접히지 않게, 펼친 사진을 다 덮는 보이지 않는 칸을 깔아요.
 *  - 펼친 동안 재생을 멈춰요. 카드가 3초 뒤 바뀌면 펼친 사진도 바뀌어서요. 접으면, 멈추기 전에 재생 중이었을 때만 이어서 재생해요.
 *  - 펼칠 때마다 새 시드를 만들어 사진을 매번 다른 자리 · 기울기로 흩뿌려요(scatterFanPoses).
 *    시드는 이벤트에서 만들어 상태로 들고 있어서, 펼친 동안 다시 그려져도 사진이 움직이지 않아요.
 *  - 사진은 처음 펼칠 때 받아요(ArrivalFanPhoto). 펼칠 사진이 없는 여행이면 펼치지도, 멈추지도 않아요.
 *
 * @param {object} props
 * @param {import('@/types').Stop[]} props.arrivalStops 0번이 맨 앞(selectArrivalStops)
 * @param {import('@/types').Stop[]} props.stops 여행 기록의 지점 전부
 * @param {import('@/types').Trip | null} props.trip 맨 앞 카드가 속한 여행
 */
export default function ArrivalCards({ arrivalStops, stops, trip }) {
  const { photos } = useMyPhotos();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [seed, setSeed] = useState(0);
  const fan = useMemo(
    () => selectTripFanPhotos(trip, stops, photos, ARRIVAL_FAN_LIMIT),
    [trip, stops, photos],
  );
  const poses = useMemo(() => scatterFanPoses(fan.photos.length, seed), [fan.photos.length, seed]);
  const hasFan = fan.photos.length > 0;
  const isOpen = hasFan && (isHovered || isFocused);
  const photoTotal = fan.photos.length + fan.rest;

  useEffect(() => {
    if (!isOpen) return undefined;
    const { isPlaying, pause } = usePlaybackStore.getState();
    if (isPlaying) pause();
    return () => {
      if (isPlaying) usePlaybackStore.getState().resume();
    };
  }, [isOpen]);

  // 접혀 있다가 펼칠 때만 새로 흩뿌려요. 마우스와 포커스가 겹쳐도 한 번만이에요.
  const prepareOpen = () => {
    if (isHovered || isFocused) return;
    setSeed(createSeed());
    setHasOpened(true);
  };

  const handleMouseEnter = () => {
    prepareOpen();
    setIsHovered(true);
  };

  const handleFocus = () => {
    prepareOpen();
    setIsFocused(true);
  };

  return (
    <section
      aria-label="도착한 지점"
      // 키보드로도 펼칠 수 있게 포커스를 받아요. 펼칠 사진이 없으면 받을 일이 없어요.
      tabIndex={hasFan ? 0 : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={() => setIsFocused(false)}
      className="pointer-events-none absolute right-8 bottom-8 size-75 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
    >
      {isOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-auto absolute right-0 bottom-0 h-[640px] w-[940px]"
        />
      )}

      {hasFan && (
        // 맨 앞 카드(상자 안 left 32 · top 46, 262 × 약 240)의 가운데가 흩뿌린 자리(scatterFanPoses)의 기준이에요.
        <ul
          aria-label={`${trip.name} 사진`}
          aria-hidden={!isOpen}
          className="absolute top-[166px] left-[163px]"
        >
          {fan.photos.map((photo, index) => (
            <ArrivalFanPhoto
              key={photo.id}
              photo={photo}
              pose={poses[index]}
              index={index}
              isOpen={isOpen}
              isLoaded={hasOpened}
            />
          ))}
        </ul>
      )}

      {arrivalStops
        .map((stop, index) => ({ stop, pose: CARD_POSES[index] }))
        .reverse()
        .map(({ stop, pose }) => (
          <ArrivalCard key={stop.id} stop={stop} className={cn('pointer-events-auto', pose)} />
        ))}

      {isOpen && (
        <p className="absolute top-3 left-8 bg-ink px-3 py-1 text-2xs whitespace-nowrap text-white">
          <span className="font-bold">{trip.name}</span> · 사진 {photoTotal}장
        </p>
      )}
    </section>
  );
}
