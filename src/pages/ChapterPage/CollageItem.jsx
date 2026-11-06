import CollagePhoto from './CollagePhoto';
import { SHADOW_CLASS } from './cardClass';
import NoteCard from './NoteCard';
import PostCard from './PostCard';
import Sticker from './Sticker';

// 기울기는 상자 가운데를 축으로 돌아서(CSS 기본), 피그마와 같은 자리에 놓여요.
function getBoxStyle({ x, y, width, height, rotate }) {
  return {
    left: x,
    top: y,
    width,
    height,
    transform: rotate === 0 ? undefined : `rotate(${rotate}deg)`,
  };
}

/**
 * 콜라주에 놓인 조각 하나예요. 종류(kind)에 맞는 조각을 layoutCollage가 정한 자리에 그려요.
 *
 * 호출: Collage가 layout.items를 하나씩 그려요. 쌓이는 순서는 items가 z 순서로 정렬되어 있어서 그리는 순서가 곧 위아래예요.
 * <CollageItem item={item} onOpenPhoto={handleOpenPhoto} />
 *
 * @param {object} props
 * @param {import('@/utils/layoutCollage').CollageItem} props.item
 * @param {(photo: import('@/types').PhotoRef) => void} props.onOpenPhoto 사진을 눌렀을 때
 */
export default function CollageItem({ item, onOpenPhoto }) {
  const handleOpenPhoto = () => onOpenPhoto(item.photo);

  return (
    <div className="absolute" style={getBoxStyle(item)}>
      {item.kind === 'hero' && (
        <PostCard post={item.post} photo={item.photo} isHero onOpenPhoto={handleOpenPhoto} />
      )}
      {item.kind === 'card' && <PostCard post={item.post} />}
      {item.kind === 'memo' && <NoteCard text={item.text} />}
      {item.kind === 'photo' && (
        <CollagePhoto
          photo={item.photo}
          onOpen={handleOpenPhoto}
          className={`size-full rounded-xs ${SHADOW_CLASS}`}
        />
      )}
      {item.kind === 'sticker' && <Sticker label={item.label} size={item.size} />}
    </div>
  );
}
