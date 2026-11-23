import PhotoGridCell from '@/components/common/PhotoGridCell';
import { usePhotoActions } from '@/hooks/usePhotoActions';

/**
 * 사진 칸에 붙는 동작 버튼 하나예요.
 *
 * @typedef {object} SortPhotoAction
 * @property {string} label 예: '빼기'
 * @property {string} workingLabel 예: '빼는 중…'
 * @property {string} failMessage 예: '사진을 빼지 못했어요'
 * @property {() => Promise<unknown>} onAction 실패하면 던져요
 * @property {boolean} [disabled] 다른 칸의 요청 때문에 이 버튼만 막을 때 true
 */

/**
 * 사진 한 장과 그 사진에 하는 동작 버튼이에요. ⋯로 펼친 여행 사진의 [빼기] · [여기서 나누기]가 써요.
 *
 * 호출:
 * <SortPhotoCard fileKey={photo.fileKey} canAct
 *   actions={[{ label: '빼기', workingLabel: '빼는 중…', failMessage: '사진을 빼지 못했어요', onAction: () => onExclude(photo.id) }]} />
 *
 * 의도:
 *  - 요청이 끝날 때까지 이 칸의 버튼을 모두 막아 두 번 보내지 않게 해요. 빼기가 성공하면 목록에서 빠져 이 칸이 사라져요.
 *  - 실패하면 칸에 그 동작의 안내를 남겨, 같은 버튼을 다시 누르면 돼요.
 *  - 요청 중 · 실패는 이 칸에서만 쓰는 값이라 여기 둬요(usePhotoActions). 제외한 사진 줄(ExcludedPhotoRow)도 같은 훅을 써요.
 *
 * @param {object} props
 * @param {string | null} props.fileKey
 * @param {string} [props.caption] 사진 아래 작은 글자. 예: 촬영 날짜
 * @param {SortPhotoAction[]} props.actions 라벨이 서로 달라야 해요(key로 써요)
 * @param {boolean} props.canAct 보정을 다 불러왔을 때만 true
 */
export default function SortPhotoCard({ fileKey, caption, actions, canAct }) {
  const { runningLabel, failMessage, run } = usePhotoActions();

  return (
    <li className="flex flex-col gap-1.5">
      <PhotoGridCell fileKey={fileKey} index={0} />
      {caption && <p className="font-serif text-2xs font-bold text-muted">{caption}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => run(action)}
              disabled={!canAct || runningLabel !== null || action.disabled}
              className="border-b border-ink text-sm font-bold text-ink disabled:border-dim disabled:text-dim"
            >
              {runningLabel === action.label ? action.workingLabel : action.label}
            </button>
          ))}
        </div>
      )}
      {failMessage && (
        <p role="alert" className="text-2xs text-accent">
          {failMessage}
        </p>
      )}
    </li>
  );
}
