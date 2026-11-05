import { Link } from 'react-router';

import { usePlaybackStore } from '@/stores/playbackStore';
import { cn } from '@/utils/cn';

import { PANEL_STYLE } from './panelStyle';

/**
 * 01 오른쪽 위의 재생 버튼과 사진 추가 링크
 *
 * 호출: MapPage
 *
 * 의도: 재생 중이면 PAUSE, 멈췄거나 끝나면 PLAY입니다. 끝난 뒤 PLAY는 처음부터 다시 재생합니다(스토어 play).
 * 글자가 바뀌어도 옆 버튼이 밀리지 않게 폭을 고정합니다. 고른 기간에 구간이 없으면 재생할 게 없어 막습니다.
 */
export default function PlaybackControls() {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const play = usePlaybackStore((state) => state.play);
  const pause = usePlaybackStore((state) => state.pause);
  const hasLegs = usePlaybackStore((state) => state.legs.length > 0);

  return (
    <div className="absolute top-11.5 right-6 flex items-center gap-2">
      <button
        type="button"
        disabled={!hasLegs}
        onClick={isPlaying ? pause : play}
        className={cn(
          'flex w-24 items-center justify-center gap-1 py-3 font-serif text-2xs font-bold tracking-[0.2em] text-nav uppercase disabled:text-dim',
          PANEL_STYLE,
        )}
      >
        <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <Link to="/upload" className="bg-ink px-5 py-3 text-sm font-medium text-white">
        + 사진 추가
      </Link>
    </div>
  );
}
