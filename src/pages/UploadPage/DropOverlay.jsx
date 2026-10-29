import PolaroidStack from './PolaroidStack';

/**
 * 13a″ 끌어오는 중 덮개
 *
 * 책임: 파일을 창 위로 끌고 들어온 동안 Nav 아래 화면을 덮어 "여기 놓으면 된다"를 보여 줍니다.
 * 놓기(drop)는 처리하지 않습니다. > usePhotoDrop
 *
 * 호출: SelectPhotosStep이 끌고 있는 동안만 그립니다. 위치를 잡는 relative 부모(main) 안에 둡니다.
 * {isDragging && <DropOverlay itemCount={itemCount} />}
 *
 * 주의할 것들:
 *  - 놓기 전에는 폴더 안을 열 수 없어서 사진 장수는 모릅니다. 맨 위 항목 수만 보여 줍니다.
 *  - pointer-events-none이라야 덮개가 끌기 이벤트를 가로채지 않고 아래 화면과 window까지 그대로 갑니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=355-87
 */
export default function DropOverlay({ itemCount }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-nav/92">
      {/* 점선 길이(12·간격 10)를 피그마와 맞추려고 border-dashed 대신 SVG로 그립니다. */}
      <svg className="absolute inset-10 h-[calc(100%-5rem)] w-[calc(100%-5rem)] overflow-visible">
        <rect
          width="100%"
          height="100%"
          rx="12"
          fill="none"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeDasharray="12 10"
        />
      </svg>

      <PolaroidStack className="w-120" />
      <p className="mt-12 text-5xl font-bold text-white">화면 아무 곳에나 놓아 주세요</p>
      <p className="mt-4 text-lg text-white/70">항목 {itemCount}개</p>
    </div>
  );
}
