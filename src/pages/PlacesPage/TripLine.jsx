import { useState } from 'react';

import Lightbox from '@/components/common/Lightbox';
import { VISIBLE_STOP_COUNT } from '@/constants/places';
import { cn } from '@/utils/cn';

import CityBlock from './CityBlock';
import FoldedStop from './FoldedStop';
import { SECTION_CLASS } from './sectionClass';

/**
 * 한 여행의 도시 블록들을 세로선으로 이어 보여 주는 부분이에요.
 *
 * 책임: 3곳까지 펼쳐 두고 나머지는 한 줄로 접어요. 사진을 누르면 그 지점의 사진을 크게 열어요.
 * 호출: PlacesView가 여행마다 key={trip.id}를 주고 써요. 그래서 여행을 바꾸면 펼친 상태와 열린 사진이 처음으로 돌아가요.
 * <TripLine key={trip.id} blocks={blocks} />
 *
 * 상태: 펼쳤는지와 크게 보는 사진은 여기 있어요. 블록들과 Lightbox의 가장 가까운 공통 부모라서요(코드 컨벤션 5절).
 *
 * @param {object} props
 * @param {import('@/utils/cityBlocks').CityBlock[]} props.blocks 시간 순서
 */
export default function TripLine({ blocks }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 크게 보는 사진이에요. 지점 id와 그 지점 사진 목록 안의 번호예요. 없으면 닫힌 상태예요.
  const [openPhoto, setOpenPhoto] = useState(null);

  const visibleBlocks = isExpanded ? blocks : blocks.slice(0, VISIBLE_STOP_COUNT);
  const foldedBlocks = isExpanded ? [] : blocks.slice(VISIBLE_STOP_COUNT);
  const openPhotos = blocks.find((block) => block.stop.id === openPhoto?.stopId)?.photos ?? [];

  const handleOpenPhoto = (stopId, index) => setOpenPhoto({ stopId, index });
  const handleChangePhoto = (index) => setOpenPhoto((current) => ({ ...current, index }));

  return (
    <section aria-label="도시별 기록" className={SECTION_CLASS}>
      <ol className={cn('relative pt-5', foldedBlocks.length === 0 ? 'pb-10' : 'pb-36')}>
        {visibleBlocks.map((block, index) => {
          const nextBlock = blocks[index + 1];
          return (
            <CityBlock
              key={block.stop.id}
              block={block}
              index={index}
              outWidth={nextBlock ? nextBlock.lineWidth : null}
              onOpenPhoto={handleOpenPhoto}
            />
          );
        })}
        {foldedBlocks.length > 0 && (
          <FoldedStop
            first={foldedBlocks[0]}
            hiddenCount={foldedBlocks.length}
            lineWidth={foldedBlocks[0].lineWidth}
            onExpand={() => setIsExpanded(true)}
          />
        )}
      </ol>

      <Lightbox
        photos={openPhotos}
        index={openPhoto ? openPhoto.index : null}
        onClose={() => setOpenPhoto(null)}
        onChange={handleChangePhoto}
      />
    </section>
  );
}
