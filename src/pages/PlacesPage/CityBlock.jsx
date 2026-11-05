import { useId, useState } from 'react';

import { LINE_DOT_TOP_PX, LINE_INTRO_PX } from '@/constants/places';
import { useReveal } from '@/hooks/useReveal';
import { cn } from '@/utils/cn';

import ArrowLink from './ArrowLink';
import CityPhoto from './CityPhoto';
import StopPosts from './StopPosts';

/**
 * 03 도시 블록 하나. 사진과 글이 좌우로 번갈아 놓이고, 가운데 세로선에 점이 찍혀요.
 *
 * 책임: 받은 CityBlock 값을 그리기만 해요. 크게 볼 사진은 부르는 쪽(TripLine)이 열어요.
 * 호출: TripLine의 목록 안에서만 써요.
 * <CityBlock block={block} index={0} outWidth={1.2} onOpenPhoto={handleOpenPhoto} />
 *
 * 의도:
 *  - 홀수 번째(index 짝수)는 사진이 왼쪽, 아니면 오른쪽이에요. 이동 라벨은 사진 쪽 선 옆에 놓여요(피그마 03).
 *  - 세로선은 블록마다 "들어오는 구간"(블록 위 → 점)과 "나가는 구간"(점 → 블록 아래)을 따로 그려요.
 *    구간마다 굵기가 달라서, 점을 기준으로 앞 구간은 이 블록이, 뒤 구간은 다음 블록의 굵기(outWidth)를 써요.
 *  - 스크롤해서 블록이 보이면 한 번 떠올라요(useReveal). 선과 점은 안 움직여요.
 *  - [글 보기 →]는 그 자리에서 글을 펼쳐요. 챕터 지점은 [챕터 열기 →]로 02 화면에 가요.
 *
 * @param {object} props
 * @param {import('@/utils/cityBlocks').CityBlock} props.block
 * @param {number} props.index 이 여행 안에서의 순서(0부터). 첫 블록 위에는 선이 먼저 나와 있어요
 * @param {number | null} props.outWidth 다음 블록으로 나가는 선의 굵기(px). 다음이 없으면 null
 * @param {(stopId: string, index: number) => void} props.onOpenPhoto 크게 볼 지점과 사진 번호
 */
export default function CityBlock({ block, index, outWidth, onOpenPhoto }) {
  const { stop, posts } = block;
  const isFirst = index === 0;
  const isPhotoLeft = index % 2 === 0;
  const { ref, isRevealed } = useReveal();
  const [isPostOpen, setIsPostOpen] = useState(false);
  const postsId = useId();

  const photoCell = (
    <CityPhoto
      fileKey={stop.coverFileKey}
      label={stop.city}
      onOpen={() => onOpenPhoto(stop.id, block.coverIndex)}
    />
  );

  const textCell = (
    <div className="flex w-full max-w-105 flex-col gap-3 pt-10">
      <p className="font-serif text-md font-bold text-muted">{block.dateRange}</p>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-6xl font-bold tracking-[-0.02em] text-ink">{stop.city}</h3>
        <span className="font-serif text-lg font-bold text-muted uppercase">
          {block.countryLabel}
        </span>
      </div>
      <div aria-hidden="true" className="h-px bg-line" />
      {block.oneLiner && (
        <p className="line-clamp-2 text-lg leading-body-lg text-body">{block.oneLiner}</p>
      )}
      <p className="flex gap-2 text-md leading-body-md text-muted">
        <span>{stop.days}일</span>
        <span aria-hidden="true">·</span>
        <span>사진 {stop.photoCount}장</span>
      </p>
      {stop.chapter && stop.slug && <ArrowLink to={`/chapter/${stop.slug}`}>챕터 열기</ArrowLink>}
      {!stop.chapter && posts.length > 0 && (
        <ArrowLink
          onClick={() => setIsPostOpen((isOpen) => !isOpen)}
          arrow={isPostOpen ? '↑' : '→'}
          aria-expanded={isPostOpen}
          aria-controls={postsId}
        >
          {isPostOpen ? '글 접기' : '글 보기'}
        </ArrowLink>
      )}
      {isPostOpen && <StopPosts id={postsId} posts={posts} />}
    </div>
  );

  return (
    <li className="relative pb-20">
      {/* 들어오는 구간: 블록 맨 위에서 점까지. 첫 블록은 위로 조금 더 나와 있어요 */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 bg-accent"
        style={{
          width: block.lineWidth,
          top: isFirst ? -LINE_INTRO_PX : 0,
          height: LINE_DOT_TOP_PX + (isFirst ? LINE_INTRO_PX : 0),
        }}
      />
      {/* 나가는 구간: 점에서 블록 아래(다음 블록 맨 위)까지 */}
      {outWidth !== null && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-accent"
          style={{ width: outWidth, top: LINE_DOT_TOP_PX }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
        style={{ top: LINE_DOT_TOP_PX, width: block.dotSize, height: block.dotSize }}
      />
      {block.inboundLabel && (
        <p
          className={cn(
            'absolute -top-7 text-xs text-accent',
            isPhotoLeft ? 'right-[calc(50%+14px)]' : 'left-[calc(50%+14px)]',
          )}
        >
          {block.inboundLabel}
        </p>
      )}

      <div
        ref={ref}
        className={cn(
          'grid grid-cols-2 transition duration-700 ease-out motion-reduce:transition-none',
          !isRevealed && 'translate-y-6 opacity-0',
        )}
      >
        <div className="flex justify-end pr-15">{isPhotoLeft ? photoCell : textCell}</div>
        <div className="flex justify-start pl-15">{isPhotoLeft ? textCell : photoCell}</div>
      </div>
    </li>
  );
}
