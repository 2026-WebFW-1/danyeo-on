import { useEffect, useMemo, useRef, useState } from 'react';

import { ARRIVAL_FAN_CLOSE_DELAY_MS, ARRIVAL_FAN_LIMIT } from '@/constants/arrivalFan';
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
 *    펼친 사진도 마우스를 받아서, 사진 위에 있는 동안은 펼친 채예요. 사진 사이 빈틈을 지날 때 접히지 않게
 *    마우스가 나가면 잠깐(ARRIVAL_FAN_CLOSE_DELAY_MS) 기다렸다 접어요. 그 사이 다시 들어오면 그대로 둬요.
 *    빈틈을 덮는 보이지 않는 칸을 깔면 그 아래의 기간 탭 · 범례 · 타임라인을 누를 수 없어서 깔지 않아요.
 *  - 펼친 동안 재생을 멈춰요. 카드가 3초 뒤 바뀌면 펼친 사진도 바뀌어서요. 접으면, 멈추기 전에 재생 중이었을 때만 이어서 재생해요.
 *  - 펼칠 때마다 새 시드로 사진을 매번 다른 자리 · 기울기로 흩뿌려요(scatterFanPoses).
 *    펼칠 때 고른 사진과 자리를 함께 상태로 찍어 두어서(openFan), 펼친 동안 사진 목록이 늦게 도착해
 *    장수가 바뀌어도 보이던 사진이 다른 자리로 튀지 않아요. 새 목록은 다음에 펼칠 때 보여요.
 *  - 사진은 처음 펼칠 때 받아요(ArrivalFanPhoto). 펼칠 사진이 없는 여행이면 펼치지도, 멈추지도 않아요.
 *  - 맨 앞 카드는 그 지점의 02 챕터나 03 기록으로 가는 링크예요(ArrivalCard, #206). 뒤 카드는 거의 가려져서 두지 않아요.
 *    카드는 펼친 사진보다 위에 그려져서 펼친 채로도 누를 수 있어요. 포커스가 상자에서 안의 링크로 옮겨 갈 때는
 *    접지 않아요. 접으면 링크에 닿는 순간 다시 펼치면서 사진이 다른 자리로 튀어요.
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
  const [openFan, setOpenFan] = useState(null);
  const closeTimerRef = useRef(null);
  const fan = useMemo(
    () => selectTripFanPhotos(trip, stops, photos, ARRIVAL_FAN_LIMIT),
    [trip, stops, photos],
  );
  const hasFan = fan.photos.length > 0;
  // 펼칠 때 찍어 둔 사진이 없으면(그때는 펼칠 사진이 없었어요) 마우스가 머물러도 다음에 들어올 때까지 펼치지 않아요.
  const isOpen =
    hasFan && (isHovered || isFocused) && openFan !== null && openFan.photos.length > 0;
  // 접혀 있을 때는 지금 고른 사진을 카드 뒤에 숨겨 두고, 펼치면 찍어 둔 사진과 자리로 그려요.
  const shownPhotos = isOpen && openFan ? openFan.photos : fan.photos;

  useEffect(() => {
    if (!isOpen) return undefined;
    const { isPlaying, pause } = usePlaybackStore.getState();
    if (isPlaying) pause();
    return () => {
      if (isPlaying) usePlaybackStore.getState().resume();
    };
  }, [isOpen]);

  // 카드가 사라지면(ArrivalStack) 기다리던 접기도 지워요.
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // 접혀 있다가 펼칠 때만 새로 흩뿌려요. 마우스와 포커스가 겹쳐도 한 번만이에요.
  const prepareOpen = () => {
    if (isHovered || isFocused) return;
    setOpenFan({
      photos: fan.photos,
      poses: scatterFanPoses(fan.photos.length, createSeed()),
    });
    setHasOpened(true);
  };

  const handleMouseEnter = () => {
    clearTimeout(closeTimerRef.current);
    prepareOpen();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => setIsHovered(false), ARRIVAL_FAN_CLOSE_DELAY_MS);
  };

  const handleFocus = () => {
    prepareOpen();
    setIsFocused(true);
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
  };

  return (
    <section
      aria-label="도착한 지점"
      // 키보드로도 펼칠 수 있게 포커스를 받아요. 펼칠 사진이 없으면 받을 일이 없어요.
      tabIndex={hasFan ? 0 : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="pointer-events-none absolute right-8 bottom-8 size-75 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
    >
      {hasFan && (
        // 맨 앞 카드(상자 안 left 32 · top 46, 262 × 약 240)의 가운데가 흩뿌린 자리(scatterFanPoses)의 기준이에요.
        <ul
          aria-label={`${trip.name} 사진`}
          aria-hidden={!isOpen}
          className="absolute top-[166px] left-[163px]"
        >
          {shownPhotos.map((photo, index) => (
            <ArrivalFanPhoto
              key={photo.id}
              photo={photo}
              pose={isOpen ? openFan.poses[index] : undefined}
              index={index}
              isOpen={isOpen}
              isLoaded={hasOpened}
            />
          ))}
        </ul>
      )}

      {arrivalStops
        .map((stop, index) => ({ stop, pose: CARD_POSES[index], isFront: index === 0 }))
        .reverse()
        .map(({ stop, pose, isFront }) => (
          <ArrivalCard
            key={stop.id}
            stop={stop}
            hasLink={isFront}
            className={cn('pointer-events-auto', pose)}
          />
        ))}

      {isOpen && (
        <p className="absolute top-3 left-8 bg-ink px-3 py-1 text-2xs whitespace-nowrap text-white">
          <span className="font-bold">{trip.name}</span> · 사진 {fan.total}장
        </p>
      )}
    </section>
  );
}
