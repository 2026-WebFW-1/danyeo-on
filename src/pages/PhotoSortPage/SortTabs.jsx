import { SORT_TABS } from '@/constants/photoSort';
import { cn } from '@/utils/cn';

import { SECTION_CLASS } from './sectionClass';

/**
 * 07 탭 줄이에요. 여행 묶음 · 위치 확인 필요 · 제외한 사진과 각 개수가 가운데로 놓이고, 고른 탭은 검정 밑줄이에요.
 *
 * 호출: PhotoSortPage가 고른 탭과 개수를 넘겨요. 누르면 주소의 ?tab=이 바뀌어요.
 * <SortTabs current="trips" counts={{ trips: 7, unlocated: 23, excluded: 4 }} onSelect={handleSelectTab} />
 *
 * 의도:
 *  - 탭 이름 색은 피그마가 #8a8a8a인데 토큰에 없어서 03 탭(TripTabs)처럼 text-dim(#9a9a9a)을 써요.
 *  - 고른 탭의 개수만 accent색이에요.
 *
 * @param {object} props
 * @param {string} props.current 고른 탭의 key
 * @param {Record<string, number>} props.counts 탭 key → 개수
 * @param {(key: string) => void} props.onSelect
 */
export default function SortTabs({ current, counts, onSelect }) {
  return (
    <nav aria-label="사진 정리 탭" className={`${SECTION_CLASS} pt-14`}>
      <ul className="flex justify-center border-b border-line">
        {SORT_TABS.map((tab) => {
          const isActive = tab.key === current;
          return (
            <li key={tab.key} className="-mb-px">
              <button
                type="button"
                onClick={() => onSelect(tab.key)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex items-baseline gap-2 border-b-2 border-transparent px-10 py-4 whitespace-nowrap',
                  isActive ? 'border-ink text-ink' : 'text-dim hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'text-lg leading-body-lg',
                    isActive ? 'font-medium' : 'font-normal',
                  )}
                >
                  {tab.label}
                </span>
                <span
                  className={cn(
                    'font-serif text-sm font-bold',
                    isActive ? 'text-accent' : 'text-dim',
                  )}
                >
                  {counts[tab.key].toLocaleString('en-US')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
