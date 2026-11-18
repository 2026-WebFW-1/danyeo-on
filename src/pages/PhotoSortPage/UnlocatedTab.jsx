import { SECTION_CLASS } from './sectionClass';
import UnlocatedGroup from './UnlocatedGroup';

/**
 * 07b 위치 확인 필요 탭이에요. 타임라인에 놓지 못한 사진(journey.unlocated)을 찍은 날짜별로 묶어 보여 줘요.
 * unlocated에는 위치가 없는 사진뿐 아니라, 위치는 있고 찍은 시각만 없는 사진도 들어 있어요(group.js). 그래서 머리 문구는
 * 두 경우를 함께 말하고, 왜 놓지 못했는지는 묶음마다 적어요(UnlocatedGroup).
 *
 * 호출: PhotoSortPage가 ?tab=unlocated일 때 그려요. 13 올리기 결과에서 이 탭으로 바로 올 수 있어요.
 * <UnlocatedTab groups={groups} canExclude onExclude={handleExcludeMany} />
 *
 * 의도:
 *  - 위치를 추정하거나 직접 정하는 일(C109)은 보정 종류에 없어서, 지금은 묶음째 타임라인에서 빼는 것만 해요.
 *  - 비었을 때는 사실만 말해요. 마지막 묶음을 빼서 비었으면 사진은 여행이 아니라 제외한 사진으로 간 거예요.
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
        위치를 확인할 사진이 없어요.
      </p>
    );
  }

  return (
    <section aria-label="위치 확인 필요" className={`${SECTION_CLASS} pt-8`}>
      <p className="pb-12 text-lg leading-body-lg text-body">
        위치나 찍은 날짜가 없어 타임라인에 놓지 못한 사진 {photoCount.toLocaleString('en-US')}
        장이에요. 찍은 날짜별로 묶었어요. 여행이 아닌 사진은 타임라인에서 빼 주세요.
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
