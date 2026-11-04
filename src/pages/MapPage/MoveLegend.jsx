import { useMemo } from 'react';

import legendCarIcon from '@/assets/icons/legend-car.svg';
import legendFlightIcon from '@/assets/icons/legend-flight.svg';
import legendTrainIcon from '@/assets/icons/legend-train.svg';
import { cn } from '@/utils/cn';
import { countLegsByMode } from '@/utils/mapScreen';

import { PANEL_STYLE } from './panelStyle';

// 구간 데이터는 버스를 구분하지 못해서 범례는 피그마대로 '버스 · 차'로 묶어요.
const LEGEND_ROWS = [
  { mode: 'flight', label: '비행', icon: legendFlightIcon },
  { mode: 'train', label: '기차', icon: legendTrainIcon },
  { mode: 'car', label: '버스 · 차', icon: legendCarIcon },
];

/**
 * 01 왼쪽 아래의 이동 수단 범례
 *
 * 책임: 지금 기간의 구간을 이동 수단별로 세어 지도 선 모양과 함께 보여 줍니다.
 * 호출: MapPage
 *
 * @param {object} props
 * @param {import('@/types').Leg[]} props.legs 지금 기간의 구간
 */
export default function MoveLegend({ legs }) {
  const counts = useMemo(() => countLegsByMode(legs), [legs]);

  return (
    <section
      aria-label="이동 수단"
      className={cn(
        'absolute bottom-25 left-8 flex flex-col items-start gap-2 pt-3 pr-5 pb-4 pl-4 whitespace-nowrap',
        PANEL_STYLE,
      )}
    >
      <h2 className="font-serif text-2xs font-bold tracking-[0.2em] text-muted uppercase">
        How I moved
      </h2>
      {LEGEND_ROWS.map(({ mode, label, icon }) => (
        <p key={mode} className="flex items-center gap-2">
          <img src={icon} alt="" width={28} height={6} />
          <span className="text-xs font-medium text-ink">{label}</span>
          <span className="font-serif text-xs font-bold tracking-[0.2em] text-muted">
            {counts[mode]}
          </span>
        </p>
      ))}
      <p className="text-2xs text-muted">거리와 이동 시간으로 추정</p>
    </section>
  );
}
