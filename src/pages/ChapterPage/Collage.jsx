import { COLLAGE_DESIGN_WIDTH, COLLAGE_TOP } from '@/constants/collage';
import { useFitScale } from '@/hooks/useFitScale';
import { cn } from '@/utils/cn';

import CollageItem from './CollageItem';
import ContinueRow from './ContinueRow';
import { FRAME_CLASS } from './frameClass';

/**
 * 챕터의 글·사진·스티커를 흩어 놓은 콜라주와, 맨 아래 [계속 여행하기 →] 줄이에요.
 *
 * 호출: ChapterView가 머리 아래에 그려요.
 * <Collage layout={layout} target={target} onOpenPhoto={handleOpenPhoto} />
 *
 * 의도:
 *  - 조각들은 좌표(px)로 놓여서 폭이 좁으면 잘리거나 겹쳐요. 그래서 기준 폭(1440px)대로 그린 뒤 화면 폭에 맞춰 줄여 보여요
 *    (useFitScale). 줄이면 글자도 같이 작아지지만, 글이 카드를 넘쳐 다른 조각을 덮는 것보다 낫다고 봤어요.
 *  - transform은 자리를 차지하는 크기를 바꾸지 않아서, 바깥 상자의 높이는 줄인 높이로 따로 정해요.
 *  - 위쪽 130px은 머리(ChapterHeader)가 겹쳐 그려지는 자리라서, 줄이지 않고 그대로 비워 둬요.
 *  - 화면이 1440px보다 넓으면 키우지 않고 가운데에 둬요(FRAME_CLASS). 머리와 같은 폭이에요.
 *
 * @param {object} props
 * @param {{ items: import('@/utils/layoutCollage').CollageItem[], height: number, continueTop: number }} props.layout
 * @param {{ path: string, label: string, nextName: string | null }} props.target getContinueTarget의 결과
 * @param {(photo: import('@/types').PhotoRef) => void} props.onOpenPhoto
 */
export default function Collage({ layout, target, onOpenPhoto }) {
  const { ref, scale } = useFitScale(COLLAGE_DESIGN_WIDTH);

  return (
    <div
      ref={ref}
      className={cn(FRAME_CLASS, 'relative')}
      style={{ marginTop: COLLAGE_TOP, height: layout.height * scale }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: COLLAGE_DESIGN_WIDTH,
          height: layout.height,
          transform: `scale(${scale})`,
        }}
      >
        {layout.items.map((item) => (
          <CollageItem key={item.key} item={item} onOpenPhoto={onOpenPhoto} />
        ))}
        <ContinueRow target={target} top={layout.continueTop} />
      </div>
    </div>
  );
}
