import { useMemo } from 'react';

import { LEG_MODES, MODE_EMOJI, MODE_LABEL } from '@/constants/journey';
import { useEscape } from '@/hooks/useEscape';
import { useSaveLegMode } from '@/hooks/useSaveLegMode';
import { cn } from '@/utils/cn';
import { canEditLegMode } from '@/utils/legMode';
import { getPlaceName } from '@/utils/mapScreen';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 고치기 모드에서 범례(MoveLegend) 자리에 펼치는 구간 목록이에요(기능 명세 M107).
 * 고칠 수 있는 구간마다 이동 수단 버튼이 있고, 누르면 그 수단으로 고쳐 저장해요(useSaveLegMode).
 *
 * 호출: MapPage. 디자인은 피그마에 없어서 범례와 같은 흰 상자 모양으로 둡니다.
 *
 * 의도:
 *  - 지도 라벨은 자리가 없으면 숨고(부산 → 경주처럼 짧은 구간) 자동으로 정한 비행은 라벨이 없어서,
 *    목록으로 모든 구간을 고칠 수 있게 해요. 집에서 나가는 구간은 보정을 받지 않아서 빼요(canEditLegMode).
 *  - 줄에 마우스를 올리거나 포커스하면 onHighlight로 알려서, 지도가 그 구간을 진하게 그려요.
 *  - 저장하는 동안에는 모든 버튼을 막아요. 저장이 끝나면 Journey가 다시 계산돼 목록이 새 이동 수단으로 바뀌어요.
 *  - 완료 버튼이나 Esc로 고치기를 끝내요. 라벨 메뉴가 열려 있으면 Esc는 메뉴만 닫아요(LegModeMenu가 막아요).
 *
 * @param {object} props
 * @param {import('@/types').Leg[]} props.legs 지금 기간이나 여행의 구간
 * @param {import('@/types').Journey['home']} props.home
 * @param {import('@/types').Stop[]} props.stops
 * @param {string | null} props.highlightedLegId
 * @param {(legId: string | null) => void} props.onHighlight
 * @param {() => void} props.onDone 같은 함수를 넘겨 주세요. 바뀔 때마다 Esc 감시를 다시 달아요
 */
export default function LegModePanel({ legs, home, stops, highlightedLegId, onHighlight, onDone }) {
  const { isLoading, hasLoadFailed, savingLegId, failedLegId, save } = useSaveLegMode();
  const editableLegs = useMemo(() => legs.filter(canEditLegMode), [legs]);
  const isUnavailable = isLoading || hasLoadFailed || savingLegId !== null;

  useEscape(onDone);

  return (
    <section
      aria-label="이동 수단 고치기"
      aria-busy={isLoading || savingLegId !== null}
      className={cn(
        'absolute bottom-25 left-8 flex max-h-[calc(100%-12rem)] w-80 flex-col',
        PANEL_STYLE,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line pt-3 pr-3 pb-2 pl-4">
        <h2 className="font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase">
          Fix how I moved
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="bg-ink px-3 py-1 text-2xs font-medium text-white"
        >
          완료
        </button>
      </div>
      <p className="px-4 pt-2 text-2xs text-muted">
        틀린 구간의 이동 수단을 골라 주세요. 집에서 나가는 구간은 고칠 수 없어요.
      </p>
      {hasLoadFailed && (
        <p role="alert" className="px-4 pt-2 text-2xs text-accent">
          보정을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      )}

      <ol className="mt-1 overflow-y-auto pb-2">
        {editableLegs.map((leg) => {
          const route = `${getPlaceName(home, stops, leg.from)} → ${getPlaceName(home, stops, leg.to)}`;
          return (
            <li
              key={leg.id}
              onPointerEnter={() => onHighlight(leg.id)}
              onPointerLeave={() => onHighlight(null)}
              onFocus={() => onHighlight(leg.id)}
              onBlur={() => onHighlight(null)}
              className={cn(
                'flex flex-wrap items-center justify-between gap-x-3 px-4 py-1.5',
                leg.id === highlightedLegId && 'bg-paper',
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{route}</p>
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
                    // disabled면 포커스를 잃어서 줄 강조가 풀려요. aria-disabled로 두고 눌러도 무시해요
                    aria-disabled={isUnavailable}
                    onClick={() => !isUnavailable && save(leg, mode)}
                    className="flex size-7 items-center justify-center border border-transparent font-emoji text-xs grayscale hover:border-line aria-disabled:cursor-default aria-pressed:border-ink aria-pressed:grayscale-0"
                  >
                    {MODE_EMOJI[mode]}
                  </button>
                ))}
              </div>
              {failedLegId === leg.id && (
                <p role="alert" className="w-full text-2xs text-accent">
                  저장하지 못했어요. 다시 골라 주세요.
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
