import { Link } from 'react-router';

import { TRIP_PARAM } from '@/constants/journey';

// 둥근 스탬프의 바깥 고리와 안쪽 점선 고리예요. 피그마 Ellipse(176px 지름, 3.5px 선 / 150px 지름 점선)와 같은 크기예요.
const ROUND_SIZE = 176;
const ROUND_CENTER = ROUND_SIZE / 2;
const OUTER_RING = { r: 86.25, strokeWidth: 3.5 };
const INNER_RING = { r: 74.4, strokeWidth: 1.2, dash: '1.2 2.6' };

/**
 * 입국 스탬프 하나예요. 누르면 그 나라에 처음 들어간 여행을 01 지도(?trip=)에서 재생해요.
 *
 * 호출: StampPage가 자리마다 모양(shape)을 정해 넘겨요. 색과 돌린 각도는 감싸는 li의 클래스가 정해요.
 * <Stamp stamp={{ cc: 'JP', country: '일본', tripId: 'p_0c434a', enteredOn: '2024-10-03', days: 3 }} shape="round" />
 *
 * 의도: 선과 글자가 모두 currentColor라서 감싸는 쪽의 text-stamp-ink-* 하나로 잉크 색이 정해져요.
 * 피그마는 색마다 고리 이미지를 따로 두었지만, 나라 순서에 따라 색이 바뀌어서 같은 모양을 SVG로 그려요.
 *
 * @param {object} props
 * @param {import('@/types').PassportStamp} props.stamp
 * @param {'round' | 'rect'} props.shape
 */
export default function Stamp({ stamp, shape }) {
  const { cc, country, tripId, enteredOn, days } = stamp;
  const date = enteredOn.replaceAll('-', '.');
  const to = { pathname: '/map', search: `?${new URLSearchParams({ [TRIP_PARAM]: tripId })}` };

  return (
    <Link
      to={to}
      aria-label={`${country} 입국 ${date}, 체류 ${days}일. 이 여행을 지도에서 보기`}
      className="block opacity-86 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      {shape === 'round' ? (
        <span className="relative block size-44">
          <svg
            aria-hidden="true"
            width={ROUND_SIZE}
            height={ROUND_SIZE}
            viewBox={`0 0 ${ROUND_SIZE} ${ROUND_SIZE}`}
            fill="none"
            stroke="currentColor"
            className="absolute inset-0"
          >
            <circle
              cx={ROUND_CENTER}
              cy={ROUND_CENTER}
              r={OUTER_RING.r}
              strokeWidth={OUTER_RING.strokeWidth}
            />
            <circle
              cx={ROUND_CENTER}
              cy={ROUND_CENTER}
              r={INNER_RING.r}
              strokeWidth={INNER_RING.strokeWidth}
              strokeDasharray={INNER_RING.dash}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-x-0 top-9 text-center font-serif text-[10px] leading-normal font-bold tracking-[1.4px]">
            ENTRY · <span className="font-sans">입국</span>
          </span>
          <span className="absolute inset-x-0 top-12.5 text-center font-serif text-6xl font-bold tracking-[-0.02em]">
            {cc}
          </span>
          <span className="absolute inset-x-8 top-28 truncate text-center text-sm font-bold">
            {country}
          </span>
          <span className="absolute inset-x-0 top-33 text-center font-serif text-2xs font-bold tracking-[0.2em]">
            {date}
          </span>
        </span>
      ) : (
        <span className="relative block h-35 w-55">
          <span className="absolute inset-0 rounded-[10px] border-[3.5px] border-current" />
          <span className="absolute inset-2 rounded-sm border-[1.2px] border-current" />
          <span className="absolute top-8.5 left-5.5 font-serif text-7xl font-bold tracking-[-0.02em]">
            {cc}
          </span>
          <span className="absolute top-11 left-28 flex max-w-24 flex-col gap-1">
            <span className="truncate text-lg font-bold">{country}</span>
            <span className="text-2xs">입국 {date}</span>
            <span className="text-2xs">체류 {days}일</span>
          </span>
        </span>
      )}
    </Link>
  );
}
