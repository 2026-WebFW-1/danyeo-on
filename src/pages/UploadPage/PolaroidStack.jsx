import { photoSource } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';

// 꾸밈용 고정 데모 사진이에요. 위치는 피그마 13a″ photo stack(480×348) 안 좌표를 %로 바꾼 값이에요.
// 예: BANFF left 37 ÷ 480 = 7.71%, top 53 ÷ 348 = 15.23%
const POLAROIDS = [
  {
    fileKey: 'public:/photos/banff-1.webp',
    caption: 'BANFF · 2025.08.24',
    position: 'left-[7.71%] top-[15.23%] -rotate-8',
  },
  {
    fileKey: 'public:/photos/osaka-1.webp',
    caption: 'OSAKA · 2025.03.12',
    position: 'left-[48.54%] top-[20.69%] rotate-7',
  },
  {
    fileKey: 'public:/photos/kyoto-1.webp',
    caption: 'KYOTO · 2025.03.14',
    position: 'left-[26.04%] top-[12.64%] rotate-2',
  },
];

/**
 * 13a″ 오른쪽 폴라로이드 묶음
 *
 * 책임: 꾸밈용 사진 세 장을 겹쳐 그립니다. 사용자의 사진이 아니라 고정 데모 사진입니다.
 * 호출: SelectPhotosStep(오른쪽), DropOverlay(끌어오는 중 가운데, #51)
 * 크기: 쓰는 쪽이 준 폭에 맞춰 늘고 줄어듭니다. 폭을 정해 주지 않으면 부모 폭을 다 씁니다.
 *       480일 때 피그마와 같고, 높이는 폭의 348/480입니다.
 */
export default function PolaroidStack({ className }) {
  // 폭이 바뀌어도 모양이 그대로 커지고 줄도록 위치는 %, 안쪽 크기는 cqw(이 상자 폭의 1%)로 적습니다.
  return (
    <div className={cn('@container relative aspect-480/348 w-full', className)}>
      {POLAROIDS.map((polaroid) => (
        <figure
          key={polaroid.caption}
          className={cn(
            'absolute h-[75.29%] w-[45.83%] bg-white p-[2.08cqw] shadow-[0_10px_14px_rgba(0,0,0,0.14)]',
            polaroid.position,
          )}
        >
          <img
            src={photoSource(polaroid.fileKey, 'thumb')}
            alt=""
            className="aspect-square w-full object-cover"
          />
          <figcaption className="mt-[2.92cqw] font-mono text-[2.29cqw] leading-normal font-medium text-body">
            {polaroid.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
