import { useState } from 'react';

import PhotoGridCell from '@/components/common/PhotoGridCell';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { canSetHome, getHomeGuide, selectHomeCandidates } from '@/utils/homePicker';

import HomeBadge from './HomeBadge';

/**
 * 05 집 칸 아래로 펼쳐지는 집 고르기예요. 도시 라디오 목록과, 고른 도시를 알리는 확정 줄이에요.
 *
 * 책임: 어느 줄을 골랐는지만 들고, [이곳을 집으로]를 누르면 고른 줄을 onConfirm에 넘겨요. 저장은 HomeSection이 해요.
 * 호출: HomeSection이 펼쳤을 때만 그려요.
 * <HomePicker journey={journey} onConfirm={(candidate) => ...} />
 *
 * 의도:
 *  - 05는 사진을 읽지 않는데, 지금 집의 사진 ID · 장수 · 대표 사진은 Journey에 없어서 펼칠 때만 내 사진을 읽어요(useMyPhotos).
 *    펼치기 전에는 읽지 않고, 읽는 동안 지금 집 줄은 사진 ID를 몰라 고를 수 없을 수 있어요.
 *  - 고른 줄은 목록을 닫으면 사라져요. 접힌 동안 남길 이유가 없어서 이 컴포넌트의 지역 상태예요.
 *
 * @param {object} props
 * @param {import('@/types').Journey | null} props.journey
 * @param {(candidate: import('@/utils/homePicker').HomeCandidate) => void} props.onConfirm
 */
export default function HomePicker({ journey, onConfirm }) {
  const { photos } = useMyPhotos();
  const [selectedKey, setSelectedKey] = useState(null);
  const candidates = selectHomeCandidates(journey, photos);
  const selected = candidates.find((candidate) => candidate.key === selectedKey) ?? null;
  const isPinned = journey?.home?.source === 'user';

  return (
    <div className="pt-6 pl-65">
      <div
        role="radiogroup"
        aria-label="집으로 삼을 도시"
        className="h-91 overflow-y-auto border border-line bg-white"
      >
        {candidates.map((candidate) => (
          <label
            key={candidate.key}
            className="flex h-14 cursor-pointer items-center gap-4 border-b border-line px-4 has-checked:bg-paper has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent has-disabled:cursor-not-allowed has-disabled:opacity-50"
          >
            <input
              type="radio"
              name="home-city"
              className="peer sr-only"
              checked={candidate.key === selectedKey}
              disabled={!candidate.photoId}
              onChange={() => setSelectedKey(candidate.key)}
            />
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center rounded-full border border-ink peer-checked:after:size-2 peer-checked:after:rounded-full peer-checked:after:bg-ink"
            />
            <div className="size-10 shrink-0">
              <PhotoGridCell fileKey={candidate.coverFileKey} index={0} />
            </div>
            <span className="text-md font-bold text-ink">{candidate.city}</span>
            <span className="text-sm text-muted">{candidate.country}</span>
            <span className="ml-auto flex items-center gap-3">
              {candidate.isCurrent && <HomeBadge>지금 집</HomeBadge>}
              {candidate.photoCount !== null && (
                <span className="text-sm text-muted">사진 {candidate.photoCount}장</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-6 pt-5">
        <p aria-live="polite" className="text-md text-body">
          {getHomeGuide(selected, isPinned)}
        </p>
        <button
          type="button"
          disabled={!canSetHome(selected, isPinned)}
          onClick={() => onConfirm(selected)}
          className="shrink-0 bg-ink px-5 py-3 text-md font-bold text-white disabled:bg-line disabled:text-dim"
        >
          이곳을 집으로
        </button>
      </div>
    </div>
  );
}
