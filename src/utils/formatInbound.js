import { MODE_LABEL } from '@/constants/journey';

/**
 * 이동 구간을 이동 수단과 거리 글자로 바꿔요. 01 지도의 구간 라벨과 03 도시 블록 위 한 줄이 같이 써요(#108).
 * 이동 시간은 MVP 밖이라 거리만 보여요(기능 명세 [확인 12번]).
 * Leg와 StopInbound 모두 mode·km를 가지고 있어서 그대로 넘기면 돼요.
 *
 * @param {{ mode: 'flight' | 'train' | 'car', km: number }} inbound
 * @returns {string} 예: '비행 · 3,250km', '기차 · 552km', '차 · 90km'
 */
export function formatInbound({ mode, km }) {
  return `${MODE_LABEL[mode]} · ${Math.round(km).toLocaleString('en-US')}km`;
}
