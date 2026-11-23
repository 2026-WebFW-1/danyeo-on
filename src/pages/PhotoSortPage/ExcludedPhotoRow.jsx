import PhotoGridCell from '@/components/common/PhotoGridCell';
import { usePhotoActions } from '@/hooks/usePhotoActions';

import { EXCLUDED_ROW_GRID_CLASS } from './sectionClass';

/**
 * 제외한 사진 탭의 줄 하나예요. 썸네일 | 찍은 날짜 | [복구] · [영구 삭제].
 *
 * 호출: ExcludedTab이 뺀 사진마다 그려요.
 * <ExcludedPhotoRow fileKey={photo.fileKey} date="2025.03.12" canAct
 *   actions={[{ label: '복구', workingLabel: '복구하는 중…', failMessage: '복구하지 못했어요', onAction: () => onRestore(photo) }]} />
 *
 * 의도:
 *  - 07a 여행 표의 줄(TripRow)과 같은 모양이에요. 칸을 나누고 줄 사이에 선을 긋고, 버튼은 줄 오른쪽 끝에 둬요.
 *  - 요청이 끝날 때까지 이 줄의 버튼을 모두 막고, 실패하면 버튼 아래에 그 동작의 안내를 남겨요.
 *    요청 중 · 실패는 이 줄에서만 쓰는 값이라 여기 둬요(usePhotoActions).
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {string | null} props.date 찍은 날짜. 모르면 null이고 '날짜 없음'으로 적어요
 * @param {import('./SortPhotoCard').SortPhotoAction[]} props.actions 라벨이 서로 달라야 해요(key로 써요)
 * @param {boolean} props.canAct 보정을 다 불러왔을 때만 true
 */
export default function ExcludedPhotoRow({ fileKey, date, actions, canAct }) {
  const { runningLabel, failMessage, run } = usePhotoActions();

  return (
    <li className={`${EXCLUDED_ROW_GRID_CLASS} items-center border-b border-line py-6`}>
      <div className="w-24">
        <PhotoGridCell fileKey={fileKey} index={0} />
      </div>
      {date ? (
        <p className="font-serif text-md font-bold tracking-[0.2em] text-ink">{date}</p>
      ) : (
        <p className="text-md font-bold text-muted">날짜 없음</p>
      )}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => run(action)}
              disabled={!canAct || runningLabel !== null || action.disabled}
              className="border border-line px-3 py-2 text-sm font-bold text-ink disabled:text-dim"
            >
              {runningLabel === action.label ? action.workingLabel : action.label}
            </button>
          ))}
        </div>
        {failMessage && (
          <p role="alert" className="text-xs text-accent">
            {failMessage}
          </p>
        )}
      </div>
    </li>
  );
}
