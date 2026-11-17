import { SECTION_CLASS } from './sectionClass';
import UnlocatedGroup from './UnlocatedGroup';

/**
 * 07b 위치 확인 필요 탭이에요. 위치가 없어 지점에 못 넣은 사진을 찍은 날짜별로 묶어 보여 줘요.
 *
 * 호출: PhotoSortPage가 ?tab=unlocated일 때 그려요. 13 올리기 결과에서 이 탭으로 바로 올 수 있어요.
 * <UnlocatedTab groups={groups} canExclude onExclude={handleExcludeMany} />
 *
 * 의도: 위치를 추정하거나 직접 정하는 일(C109)은 보정 종류에 없어서, 지금은 묶음째 타임라인에서 빼는 것만 해요.
 *
 * @param {object} props
 * @param {import('@/utils/photoSort').UnlocatedGroup[]} props.groups
 * @param {boolean} props.canExclude
 * @param {(photoIds: string[]) => Promise<unknown>} props.onExclude
 */
export default function UnlocatedTab({ groups, canExclude, onExclude }) {
  const photoCount = groups.reduce((sum, group) => sum + group.photos.length, 0);

  if (groups.length === 0) {
    return (
      <p className={`${SECTION_CLASS} pt-12 text-center text-lg leading-body-lg text-muted`}>
        위치를 확인할 사진이 없어요. 모든 사진이 여행에 들어갔어요.
      </p>
    );
  }

  return (
    <section aria-label="위치 확인 필요" className={`${SECTION_CLASS} pt-8`}>
      <p className="pb-12 text-lg leading-body-lg text-body">
        위치 정보가 없는 사진 {photoCount.toLocaleString('en-US')}장이에요. 찍은 날짜별로 묶었어요.
        여행이 아닌 사진은 타임라인에서 빼 주세요.
      </p>
      <ul className="flex flex-col gap-12">
        {groups.map((group) => (
          <UnlocatedGroup
            key={group.key}
            group={group}
            canExclude={canExclude}
            onExclude={onExclude}
          />
        ))}
      </ul>
    </section>
  );
}
