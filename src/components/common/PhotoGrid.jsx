import PhotoGridCell from '@/components/common/PhotoGridCell';
import { cn } from '@/utils/cn';

/**
 * 사진을 작은 그림(thumb) 격자로 보여 주는 부품. 이미지가 없는 사진은 회색 칸이에요.
 * 크게 보는 건 Lightbox가 해요. onSelect를 안 주면 누를 수 없는 그림 모음이에요.
 *
 * 호출: 칸 수·폭은 className으로 바꿔요. 기본은 96px 이상으로 폭을 채워요(00b 사진 크기).
 * <PhotoGrid photos={photos} onSelect={setOpenIndex} />
 * <PhotoGrid photos={photos} className="w-fit grid-cols-4" />
 *
 * @param {object} props
 * @param {import('@/types').PhotoRef[]} props.photos
 * @param {(index: number) => void} [props.onSelect]
 * @param {string} [props.className]
 */
export default function PhotoGrid({ photos, onSelect, className }) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2', className)}>
      {photos.map((photo, index) => (
        <PhotoGridCell key={photo.id} fileKey={photo.fileKey} index={index} onSelect={onSelect} />
      ))}
    </div>
  );
}
