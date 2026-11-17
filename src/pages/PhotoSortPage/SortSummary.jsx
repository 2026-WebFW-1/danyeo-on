import { Link } from 'react-router';

import { SECTION_CLASS } from './sectionClass';

/**
 * 07 요약 줄이에요. 왼쪽은 불러온 사진 · 위치 있음 · 위치 없음 · 자동 정리, 오른쪽은 [사진 더 추가 →] · [완료]예요.
 *
 * 호출: PhotoSortPage가 사진 수와 여행·도시 수를 넘겨요.
 * <SortSummary photos={{ total: 1284, located: 1261, unlocated: 23 }} tripCount={7} cityCount={13} />
 *
 * 의도:
 *  - [사진 더 추가]는 13 올리기, [완료]는 03 전체 기록으로 가요. Journey를 아직 계산하는 중이면 03은 앞 Journey를
 *    보여 주다가 저장되면 새로고침 없이 바뀌어요(#151).
 *  - 여행·도시 수는 Journey 기준이라, 보정을 저장한 뒤 계산이 끝날 때까지는 앞 값이에요.
 *
 * @param {object} props
 * @param {{ total: number, located: number, unlocated: number }} props.photos
 * @param {number} props.tripCount
 * @param {number} props.cityCount
 */
export default function SortSummary({ photos, tripCount, cityCount }) {
  const counts = [
    { label: '불러온 사진', value: photos.total },
    { label: '위치 있음', value: photos.located },
    { label: '위치 없음', value: photos.unlocated },
  ];

  return (
    <section
      aria-label="사진 요약"
      className={`${SECTION_CLASS} flex items-center justify-between pt-8`}
    >
      <dl className="flex gap-8 whitespace-nowrap">
        {counts.map((count) => (
          <div key={count.label} className="flex items-baseline gap-2">
            <dt className="text-sm text-muted">{count.label}</dt>
            <dd className="font-serif text-lg font-bold text-ink">
              {count.value.toLocaleString('en-US')}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline gap-2">
          <dt className="text-sm text-muted">자동 정리</dt>
          <dd className="text-lg font-bold text-ink">
            <span className="font-serif">{tripCount.toLocaleString('en-US')}</span>개 여행 ·{' '}
            <span className="font-serif">{cityCount.toLocaleString('en-US')}</span>개 도시
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-6">
        <Link
          to="/upload"
          className="flex gap-1 border-b border-ink pb-1 text-md font-bold whitespace-nowrap text-ink"
        >
          사진 더 추가
          <span aria-hidden="true" className="font-serif">
            →
          </span>
        </Link>
        <Link to="/places" className="bg-ink px-6 py-3 text-md font-bold text-white">
          완료
        </Link>
      </div>
    </section>
  );
}
