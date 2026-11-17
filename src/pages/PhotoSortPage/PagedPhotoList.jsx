import { useState } from 'react';

import { SORT_PHOTO_PAGE_SIZE } from '@/constants/photoSort';
import { cn } from '@/utils/cn';

/**
 * 사진 칸을 격자로 그리되, 앞에서부터 SORT_PHOTO_PAGE_SIZE장만 그리고 나머지는 [더 보기]로 늘려요.
 *
 * 호출: 여행 사진 펼치기(TripPhotos)와 제외한 사진 탭(ExcludedTab)이 써요. 칸은 renderItem이 그려요(li).
 * <PagedPhotoList items={photos} label="방콕 · 다낭 사진" renderItem={(photo) => <SortPhotoCard ... />} />
 *
 * 의도: 올린 사진은 칸마다 서명 주소를 받아서, 여행 하나에 수백 장을 한꺼번에 그리면 요청이 몰려요.
 *       그리는 수(보이는 장수)는 이 목록에서만 쓰는 값이라 여기 둬요.
 *
 * @template T
 * @param {object} props
 * @param {T[]} props.items
 * @param {string} props.label 목록 이름(스크린 리더용)
 * @param {(item: T) => import('react').ReactNode} props.renderItem
 * @param {string} [props.className] 격자 칸 크기를 바꿀 때
 */
export default function PagedPhotoList({ items, label, renderItem, className }) {
  const [visibleCount, setVisibleCount] = useState(SORT_PHOTO_PAGE_SIZE);
  const restCount = items.length - visibleCount;

  return (
    <div className="flex flex-col items-start gap-6">
      <ul
        aria-label={label}
        className={cn('grid w-full grid-cols-[repeat(auto-fill,6rem)] gap-x-3 gap-y-5', className)}
      >
        {items.slice(0, visibleCount).map(renderItem)}
      </ul>
      {restCount > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + SORT_PHOTO_PAGE_SIZE)}
          className="border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink"
        >
          더 보기 <span className="font-serif text-muted">{restCount.toLocaleString('en-US')}</span>
        </button>
      )}
    </div>
  );
}
