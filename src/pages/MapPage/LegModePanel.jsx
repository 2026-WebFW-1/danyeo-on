import { useMemo, useState } from 'react';

import { LEG_MODES, MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import { useCorrections } from '@/hooks/useCorrections';
import { useEscape } from '@/hooks/useEscape';
import { cn } from '@/utils/cn';
import { canEditLegMode, toModeCorrection } from '@/utils/legMode';
import { getPlaceName } from '@/utils/mapScreen';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 고치기 모드에서 범례(MoveLegend) 자리에 펼치는 구간 목록이에요(기능 명세 M107).
 * 고칠 수 있는 구간마다 이동 수단 버튼이 있고, 고른 수단은 초안(useLegModeDraft)에만 담겨요.
 * 완료를 눌러야 바꾼 구간을 한꺼번에 저장하고, 취소나 Esc는 초안을 버리고 끝내요.
 *
 * 호출: MapPage. 디자인은 피그마에 없어서 범례와 같은 흰 상자 모양으로 둡니다.
 *
 * 의도:
 *  - 지도 라벨은 자리가 없으면 숨고(부산 → 경주처럼 짧은 구간) 자동으로 정한 비행은 라벨이 없어서,
 *    목록으로 모든 구간을 고칠 수 있게 해요. 집에서 나가는 구간은 보정을 받지 않아서 빼요(canEditLegMode).
 *  - 한꺼번에 저장하면(addMany) Journey를 한 번만 다시 계산해요. 하나씩 저장하면 고를 때마다 다시 계산해요.
 *  - 보정 목록은 무거운 my_data를 읽어서, 지도를 열 때가 아니라 이 목록을 펼칠 때 불러요(useCorrections).
 *    불러오는 동안에도 고를 수는 있고, 완료만 막아요.
 *  - 저장에 실패하면 끝내지 않고 초안을 그대로 둬서 다시 완료를 누를 수 있어요.
 *    addMany는 앞에서부터 저장해서 일부만 저장됐을 수 있지만, 같은 구간의 보정은 마지막 것만 쓰여서 다시 저장해도 괜찮아요.
 *  - 줄에 마우스를 올리거나 포커스하면 onHighlight로 알려서, 지도가 그 구간을 진하게 그려요.
 *  - 라벨 메뉴가 열려 있으면 Esc는 메뉴만 닫아요(LegModeMenu가 막아요).
 *
 * @param {object} props
 * @param {import('@/types').Leg[]} props.legs 초안을 얹은 구간(useLegModeDraft의 displayLegs)
 * @param {{ leg: import('@/types').Leg, mode: import('@/types').Leg['mode'] }[]} props.changes 저장할 것
 * @param {import('@/types').Journey['home']} props.home
 * @param {import('@/types').Stop[]} props.stops
 * @param {string | null} props.highlightedLegId
 * @param {(legId: string | null) => void} props.onHighlight
 * @param {(leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => void} props.onChangeMode
 * @param {() => void} props.onSaved 완료해서 저장이 끝나면. 바꾼 게 없으면 저장 없이 바로 불러요
 * @param {() => void} props.onCancel 같은 함수를 넘겨 주세요. 바뀔 때마다 Esc 감시를 다시 달아요
 */
export default function LegModePanel({
  legs,
  changes,
  home,
  stops,
  highlightedLegId,
  onHighlight,
  onChangeMode,
  onSaved,
  onCancel,
}) {
  const { status, addMany } = useCorrections();
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const editableLegs = useMemo(() => legs.filter(canEditLegMode), [legs]);
  const changedLegIds = new Set(changes.map(({ leg }) => leg.id));
  const canSave = changes.length === 0 || status === 'ready';

  useEscape(onCancel, !isSaving);

  const handleDone = async () => {
    if (isSaving || !canSave) return;
    if (changes.length === 0) {
      onSaved();
      return;
    }
    setIsSaving(true);
    setHasFailed(false);
    try {
      await addMany(changes.map(({ leg, mode }) => toModeCorrection(leg, mode)));
    } catch {
      setIsSaving(false);
      setHasFailed(true);
      return;
    }
    onSaved();
  };

  return (
    <section
      aria-label="이동 수단 고치기"
      aria-busy={isSaving}
      className={cn(
        'absolute bottom-25 left-8 flex max-h-[calc(100%-12rem)] w-80 flex-col',
        PANEL_STYLE,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line pt-3 pr-3 pb-2 pl-4">
        <h2 className="font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase">
          Fix how I moved
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="border border-line px-3 py-1 text-2xs font-medium text-ink disabled:text-dim"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDone}
            // disabled면 포커스를 잃어서, 못 누르는 동안에도 aria-disabled로 두고 눌러도 무시해요
            aria-disabled={isSaving || !canSave}
            className="bg-ink px-3 py-1 text-2xs font-medium text-white aria-disabled:bg-dim"
          >
            {isSaving ? '저장 중' : '완료'}
          </button>
        </div>
      </div>
      <p className="px-4 pt-2 text-2xs text-muted">
        {changes.length > 0
          ? `${changes.length}개 바꿨어요. 완료를 눌러야 저장돼요.`
          : '틀린 구간의 이동 수단을 골라 주세요. 집에서 나가는 구간은 고칠 수 없어요.'}
      </p>
      {status === 'error' && (
        <p role="alert" className="px-4 pt-2 text-2xs text-accent">
          보정을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      )}
      {hasFailed && (
        <p role="alert" className="px-4 pt-2 text-2xs text-accent">
          저장하지 못했어요. 다시 완료를 눌러 주세요.
        </p>
      )}

      <ol className="mt-1 overflow-y-auto pb-2">
        {editableLegs.map((leg) => {
          const route = `${getPlaceName(home, stops, leg.from)} → ${getPlaceName(home, stops, leg.to)}`;
          const isChanged = changedLegIds.has(leg.id);
          return (
            <li
              key={leg.id}
              onPointerEnter={() => onHighlight(leg.id)}
              onPointerLeave={() => onHighlight(null)}
              onFocus={() => onHighlight(leg.id)}
              onBlur={() => onHighlight(null)}
              className={cn(
                'flex items-center justify-between gap-3 px-4 py-1.5',
                leg.id === highlightedLegId && 'bg-paper',
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {route}
                  {isChanged && <span className="ml-1.5 text-2xs text-accent">바꿈</span>}
                </p>
                <p className="text-2xs text-muted">
                  {leg.departAt.slice(0, 10).replaceAll('-', '.')} ·{' '}
                  {Math.round(leg.km).toLocaleString('en-US')}km
                </p>
              </div>
              <div role="group" aria-label={`${route} 이동 수단`} className="flex gap-0.5">
                {LEG_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={mode === leg.mode}
                    aria-label={MODE_LABEL[mode]}
                    title={MODE_LABEL[mode]}
                    aria-disabled={isSaving}
                    onClick={() => !isSaving && onChangeMode(leg, mode)}
                    className="flex size-7 items-center justify-center border border-transparent font-emoji text-xs grayscale hover:border-line aria-disabled:cursor-default aria-pressed:border-ink aria-pressed:grayscale-0"
                  >
                    {MODE_EMOJI[mode]}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
