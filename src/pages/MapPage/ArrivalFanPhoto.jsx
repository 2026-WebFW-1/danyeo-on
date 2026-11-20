import { ARRIVAL_FAN_STAGGER_MS } from '@/constants/arrivalFan';
import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';

/**
 * 01 도착 카드 더미에서 펼치는 여행 사진 한 장이에요(#187).
 *
 * 호출: ArrivalCards. 맨 앞 카드 가운데에 놓인 <ul> 안에서 pose만큼 옮겨 그려요.
 * <ArrivalFanPhoto photo={{ id, fileKey, city }} pose={{ x: -280, y: -110, rotate: -25 }} index={0} isOpen isLoaded />
 *
 * 의도:
 *  - 접혀 있을 때는 카드 뒤에 작게 숨어 있다가, 펼치면 자기 자리로 미끄러져 나와요. 하나씩 이어서 나오게 순서만큼 늦춰요.
 *  - 자리는 사진 장수마다 달라서(calcFanPoses) transform을 style로 줘요.
 *  - 이미지는 처음 펼칠 때(isLoaded) 받아요. 지도를 보기만 하는 사람에게 사진 여러 장을 미리 받지 않아요.
 *  - 도착 카드와 같은 흰 테두리 · 그림자예요. 피그마에 펼친 모양이 없어서 카드에 맞췄어요.
 *
 * @param {object} props
 * @param {import('@/utils/tripFanPhotos').FanPhoto} props.photo
 * @param {import('@/utils/tripFanPhotos').FanPose} props.pose
 * @param {number} props.index 펼치는 순서
 * @param {boolean} props.isOpen
 * @param {boolean} props.isLoaded 한 번이라도 펼쳤으면 true. 그때부터 이미지를 받아요
 */
export default function ArrivalFanPhoto({ photo, pose, index, isOpen, isLoaded }) {
  const src = usePhoto(isLoaded ? photo.fileKey : null, 'thumb');
  const transform = isOpen
    ? `translate(-50%, -50%) translate(${pose.x}px, ${pose.y}px) rotate(${pose.rotate}deg)`
    : 'translate(-50%, -50%) scale(0.5)';

  return (
    <li
      className={cn(
        'absolute top-0 left-0 w-32 bg-white p-1.5 pb-1 shadow-[0px_10px_28px_0px_rgba(0,0,0,0.1)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        isOpen ? 'opacity-100' : 'opacity-0',
      )}
      style={{ transform, transitionDelay: isOpen ? `${index * ARRIVAL_FAN_STAGGER_MS}ms` : '0ms' }}
    >
      {src ? (
        <img src={src} alt={`${photo.city} 사진`} className="aspect-4/3 w-full object-cover" />
      ) : (
        <div className="aspect-4/3 w-full bg-line" />
      )}
      <p className="mt-1 truncate text-center text-2xs text-body">{photo.city}</p>
    </li>
  );
}
