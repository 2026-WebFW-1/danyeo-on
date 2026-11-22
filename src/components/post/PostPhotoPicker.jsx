import { usePhoto } from '@/hooks/usePhoto';
import { cn } from '@/utils/cn';
import { movePhoto } from '@/utils/postPhotos';

const MOVE_BUTTON_CLASS = 'border border-line px-1.5 text-xs text-ink disabled:opacity-30';

/**
 * 글에 붙일 그날 사진 줄
 *
 * 책임: 그날 사진을 썸네일로 보여 주고, 눌러서 넣고 빼고, ← →로 고른 사진의 순서를 바꿉니다.
 * 고른 사진 목록은 PostEditor가 들고 있습니다.
 *
 * 호출: PostEditor
 * <PostPhotoPicker photos={dayPhotos} selectedIds={form.photoIds} isDisabled={isSaving} onChange={(ids) => ...} />
 *
 * 의도:
 *  - 고른 사진은 고른 순서대로 앞에 번호를 붙여 두고, 안 고른 사진은 흐리게 뒤에 둡니다. 첫 장이 02의 대표 사진이 돼요.
 *  - 안 고른 사진을 누르면 맨 뒤에 넣습니다.
 *
 * 주의할 것들:
 *  - 썸네일을 CollagePhoto로 그리지 않습니다. CollagePhoto는 "사진 크게 보기" 버튼이라 고르기 버튼 안에 넣으면 버튼이 겹쳐요.
 *  - 사진 파일이 없는 사진(fileKey가 null)도 회색 칸으로 고를 수 있습니다.
 *  - 마지막 한 장은 뺄 수 없습니다. 빈 목록은 다시 열 때 "그날 사진 전부"가 돼서(utils/postPhotos),
 *    뺀 줄 알았던 사진이 다른 걸 고쳐 저장할 때 말없이 다시 붙어요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-158
 *
 * @param {object} props
 * @param {import('@/types').Photo[]} props.photos 그날 사진, 촬영 순서
 * @param {string[]} props.selectedIds 고른 사진 ID, 붙일 순서
 * @param {boolean} props.isDisabled
 * @param {(ids: string[]) => void} props.onChange
 */
export default function PostPhotoPicker({ photos, selectedIds, isDisabled, onChange }) {
  const selected = selectedIds
    .map((id) => photos.find((photo) => photo.id === id))
    .filter((photo) => photo !== undefined);
  const unselected = photos.filter((photo) => !selectedIds.includes(photo.id));

  // 고른 줄과 안 고른 줄을 한 배열로 그려요. 따로 그리면 줄을 옮긴 사진이 새로 그려져 누른 버튼의 포커스가 사라져요.
  const items = [
    ...selected.map((photo, index) => (
      <li key={photo.id} className="flex flex-col items-center gap-1">
        <PhotoButton
          photo={photo}
          order={index + 1}
          isDisabled={isDisabled || selected.length === 1}
          onClick={() => onChange(selectedIds.filter((id) => id !== photo.id))}
        />
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`${photo.fileName} 앞으로`}
            disabled={isDisabled || index === 0}
            onClick={() => onChange(movePhoto(selectedIds, index, index - 1))}
            className={MOVE_BUTTON_CLASS}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`${photo.fileName} 뒤로`}
            disabled={isDisabled || index === selected.length - 1}
            onClick={() => onChange(movePhoto(selectedIds, index, index + 1))}
            className={MOVE_BUTTON_CLASS}
          >
            →
          </button>
        </div>
      </li>
    )),
    ...unselected.map((photo) => (
      <li key={photo.id}>
        <PhotoButton
          photo={photo}
          isDisabled={isDisabled}
          onClick={() => onChange([...selectedIds, photo.id])}
        />
      </li>
    )),
  ];

  return <ul className="flex flex-wrap gap-2">{items}</ul>;
}

function PhotoButton({ photo, order, isDisabled, onClick }) {
  const src = usePhoto(photo.fileKey, 'thumb');
  const isSelected = order !== undefined;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`사진 ${photo.fileName} ${isSelected ? '빼기' : '넣기'}`}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'relative block size-16 overflow-clip bg-line disabled:cursor-default',
        !isSelected && 'opacity-40',
      )}
    >
      {src && <img src={src} alt="" loading="lazy" className="size-full object-cover" />}
      {isSelected && (
        <span className="absolute top-0 left-0 bg-ink px-1 text-xs font-bold text-white">
          {order}
        </span>
      )}
    </button>
  );
}
